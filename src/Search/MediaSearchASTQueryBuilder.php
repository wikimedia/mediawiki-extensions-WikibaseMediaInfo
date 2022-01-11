<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\AST\BooleanClause;
use CirrusSearch\Parser\AST\EmptyQueryNode;
use CirrusSearch\Parser\AST\FuzzyNode;
use CirrusSearch\Parser\AST\KeywordFeatureNode;
use CirrusSearch\Parser\AST\NamespaceHeaderNode;
use CirrusSearch\Parser\AST\NegatedNode;
use CirrusSearch\Parser\AST\ParsedBooleanNode;
use CirrusSearch\Parser\AST\ParsedNode;
use CirrusSearch\Parser\AST\ParsedQuery;
use CirrusSearch\Parser\AST\PhrasePrefixNode;
use CirrusSearch\Parser\AST\PhraseQueryNode;
use CirrusSearch\Parser\AST\PrefixNode;
use CirrusSearch\Parser\AST\Visitor\Visitor;
use CirrusSearch\Parser\AST\WildcardNode;
use CirrusSearch\Parser\AST\WordsQueryNode;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\FunctionScore;
use Elastica\Query\MatchNone;
use Elastica\Script\Script;
use SplObjectStorage;
use Wikibase\MediaInfo\Search\ASTQueryBuilder\PhraseQueryNodeHandler;
use Wikibase\MediaInfo\Search\ASTQueryBuilder\WikibaseEntitiesHandler;
use Wikibase\MediaInfo\Search\ASTQueryBuilder\WordsQueryNodeHandler;
use Wikimedia\Assert\Assert;

class MediaSearchASTQueryBuilder implements Visitor {
	/** @var SplObjectStorage */
	private $map;

	/** @var ParsedQuery */
	private $parsedQuery;

	/** @var MediaSearchASTEntitiesExtractor */
	private $entitiesExtractor;

	/** @var array[] */
	private $stemmingSettings;

	/** @var string[] */
	private $languages;

	/** @var string */
	private $contentLanguage;

	/** @var float[] */
	private $boosts;

	/** @var float[] */
	private $decays;

	/** @var array */
	private $options;

	/**
	 * @param MediaSearchASTEntitiesExtractor $entitiesExtractor
	 * @param array[] $stemmingSettings Stemming settings (see $wgWBCSUseStemming)
	 * @param string[] $languages Languages to search text in
	 * @param string $contentLanguage Content language code
	 * @param array[] $settings Optional weight/decay overrides, plus some options
	 */
	public function __construct(
		MediaSearchASTEntitiesExtractor $entitiesExtractor,
		array $stemmingSettings,
		array $languages,
		string $contentLanguage,
		array $settings = []
	) {
		$this->entitiesExtractor = $entitiesExtractor;
		$this->stemmingSettings = $stemmingSettings;
		$this->languages = $languages;
		$this->contentLanguage = $contentLanguage;
		$this->boosts = ( $settings['boost'] ?? [] ) + [
			'statement' => 1.0,
			'descriptions.$language' => 1.0,
			'descriptions.$language.plain' => 1.0,
			'title' => 1.0,
			'title.plain' => 1.0,
			'category' => 1.0,
			'category.plain' => 1.0,
			'heading' => 1.0,
			'heading.plain' => 1.0,
			'auxiliary_text' => 1.0,
			'auxiliary_text.plain' => 1.0,
			'file_text' => 1.0,
			'file_text.plain' => 1.0,
			'redirect.title' => 1.0,
			'redirect.title.plain' => 1.0,
			'text' => 1.0,
			'text.plain' => 1.0,
			'suggest' => 1.0,
		];
		$this->decays = ( $settings['decay'] ?? [] ) + [
			'descriptions.$language' => 1.0,
			'descriptions.$language.plain' => 1.0,
			'synonyms' => 1.0,
		];
		$this->options = [
			'normalizeFulltextScores' => (bool)( $settings['normalizeFulltextScores'] ?? true ),
			'normalizeMultiClauseScores' => (bool)( $settings['normalizeMultiClauseScores'] ?? false ),
			'hasLtrPlugin' => (bool)( $settings['hasLtrPlugin'] ?? false ),
			'entitiesVariableBoost' => (bool)( $settings['entitiesVariableBoost'] ?? true ),
			'applyLogisticFunction' => (bool)( $settings['applyLogisticFunction'] ?? false ),
			'useSynonyms' => (bool)( $settings['useSynonyms'] ?? false ),
			'logisticRegressionIntercept' => (float)( $settings['logisticRegressionIntercept'] ?? 0 ),
		];
	}

	public function getQuery( ParsedQuery $parsedQuery ): AbstractQuery {
		$this->map = new SplObjectStorage();
		$this->parsedQuery = $parsedQuery;
		$root = $parsedQuery->getRoot();
		$root->accept( $this );

		return $this->map[$root] ?? new MatchNone();
	}

	/**
	 * Applies a logistic function to the sum of the scores minus a constant
	 *
	 * @see https://phabricator.wikimedia.org/T271799
	 * @param AbstractQuery $query
	 * @return AbstractQuery
	 */
	private function applyLogisticFunction( AbstractQuery $query ): AbstractQuery {
		if ( !$this->options[ 'applyLogisticFunction' ] ) {
			return $query;
		}

		return ( new FunctionScore() )
			->setQuery( $query )
			->addScriptScoreFunction(
				new Script(
					// this will produce scores in the 0-100 range
					'100 / ( 1 + exp( -1 * ( _score + intercept ) ) )',
					[ 'intercept' => $this->options['logisticRegressionIntercept'] ],
					'expression'
				)
			);
	}

	/**
	 * If we've applied a logistic function to the scores, then we expect the score to be
	 * between 0 and 100, HOWEVER if we have >1 text nodes we get a score of 0-1 for each,
	 * and therefore end up with a final score between 0 and 100*(number of nodes)
	 * Wrap the root node inside a function that divides the score by the number of nodes
	 *
	 * @param BoolQuery $query
	 * @return AbstractQuery
	 */
	private function normalizeMultiClauseScores( BoolQuery $query ): AbstractQuery {
		if (
			!$this->options[ 'applyLogisticFunction' ]
			 || !$this->options[ 'normalizeMultiClauseScores' ]
		) {
			return $query;
		}

		if ( $query->count() <= 1 ) {
			return $query;
		}

		return ( new FunctionScore() )
			->setQuery( $query )
			->addScriptScoreFunction(
				new Script(
					'_score / count',
					[ 'count' => $query->count() ],
					'expression'
				)
			);
	}

	public function visitParsedBooleanNode( ParsedBooleanNode $node ) {
		$query = new BoolQuery();

		foreach ( $node->getClauses() as $clause ) {
			$clauseNode = $clause->getNode();
			$clauseNode->accept( $this );
			if ( isset( $this->map[$clauseNode] ) ) {
				switch ( $clause->getOccur() ) {
					case BooleanClause::SHOULD:
						$query->addShould( $this->map[$clauseNode] );
						break;
					case BooleanClause::MUST:
						$query->addMust( $this->map[$clauseNode] );
						break;
					case BooleanClause::MUST_NOT:
						$query->addMustNot( $this->map[$clauseNode] );
						break;
				}
			}
		}

		if ( $query->count() > 0 ) {
			$query = $this->normalizeMultiClauseScores( $query );
			$this->map[$node] = $query;
		}
	}

	public function visitBooleanClause( BooleanClause $clause ) {
		// BooleanClause is being handled in visitParsedBooleanNode already,
		// this will not be visited
	}

	public function visitWordsQueryNode( WordsQueryNode $node ) {
		$synonyms = array_merge(
			$this->getSynonyms( $node ),
			[ $node->getWords() => 1 ]
		);

		$toCanonicalForm = static function ( string $term ) {
			$canonical = strtolower( $term );
			// replace punctuation (\p{P}) and separators (\p{Z}) by a single space
			$canonical = preg_replace( '/[\p{P}\p{Z}]+/u', ' ', $canonical );
			return trim( $canonical );
		};

		// remove variations, preserving the highest value in case of duplicates
		$synonyms = array_reduce(
			array_keys( $synonyms ),
			static function ( $result, $term ) use ( $synonyms, $toCanonicalForm ) {
				$canonical = $toCanonicalForm( $term );
				$result[$canonical] = max( $synonyms[$term], $result[$canonical] ?? 0 );
				return $result;
			},
			[]
		);

		// sort synonyms by descending weight & descending term length
		uksort( $synonyms, static function ( $a, $b ) {
			return strlen( $a ) <=> strlen( $b );
		} );
		arsort( $synonyms );

		// remove synonyms that are a superset of something we're already searching
		// (unless said superset has a higher weight)
		// e.g. if we're already matching "commons", then trying to find documents
		// with "wikimedia commons" would yield no additional results - they'd
		// already be found with "commons"...
		// (yes, they would get a higher score for "wikimedia commons", but that's
		// no more or less correct than "commons" in this case - it's just as good
		// a description as the longer form as far as we know, both referring to the
		// exact same concept
		$synonyms = array_reduce(
			array_keys( $synonyms ),
			static function ( $result, $term ) use ( $synonyms ) {
				foreach ( $result as $existing => $weight ) {
					if ( preg_match( '/\b' . preg_quote( $existing, '/' ) . '\b/', $term ) ) {
						// another term of equal or higher weight already matches this
						return $result;
					}
				}
				$result[$term] = $synonyms[$term];
				return $result;
			},
			[]
		);

		// remove original term (and duplicates thereof)
		unset( $synonyms[$toCanonicalForm( $node->getWords() )] );

		$nodeHandler = new WordsQueryNodeHandler(
			$node,
			$this->getWikibaseEntitiesHandler( $node ),
			$this->languages,
			$synonyms,
			array_fill_keys( $synonyms, [ $this->contentLanguage ] ),
			$this->stemmingSettings,
			$this->boosts,
			$this->decays,
			$this->options
		);
		$this->map[$node] = $this->applyLogisticFunction( $nodeHandler->transform() );
	}

	public function visitPhraseQueryNode( PhraseQueryNode $node ) {
		$nodeHandler = new PhraseQueryNodeHandler(
			$node,
			$this->getWikibaseEntitiesHandler( $node ),
			$this->languages,
			$this->stemmingSettings,
			$this->boosts,
			$this->decays
		);
		$this->map[$node] = $nodeHandler->transform();
	}

	public function visitPhrasePrefixNode( PhrasePrefixNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'PhrasePrefixNode not (yet) supported.' );
	}

	public function visitNegatedNode( NegatedNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'NegatedNode not (yet) supported.' );
	}

	public function visitFuzzyNode( FuzzyNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'FuzzyNode not (yet) supported.' );
	}

	public function visitPrefixNode( PrefixNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'PrefixNode not (yet) supported.' );
	}

	public function visitWildcardNode( WildcardNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'WildcardNode not (yet) supported.' );
	}

	public function visitEmptyQueryNode( EmptyQueryNode $node ) {
		// nothing...
	}

	public function visitKeywordFeatureNode( KeywordFeatureNode $node ) {
		// this is already dealt with elsewhere in the query building process
	}

	public function visitNamespaceHeader( NamespaceHeaderNode $node ) {
		// this is already dealt with elsewhere in the query building process
	}

	private function getWikibaseEntitiesHandler( ParsedNode $node ) {
		return new WikibaseEntitiesHandler(
			$node,
			$this->parsedQuery,
			$this->entitiesExtractor,
			$this->boosts,
			$this->options
		);
	}

	/**
	 * @param WordsQueryNode $node
	 * @param float $threshold relevance percentage below which not to include synonyms
	 * @return array [synonym => score]
	 */
	private function getSynonyms( WordsQueryNode $node, $threshold = 0.5 ): array {
		if ( !$this->options[ 'useSynonyms' ] ) {
			return [];
		}

		$entities = $this->entitiesExtractor->getEntities( $this->parsedQuery, $node );

		$synonyms = [];
		foreach ( $entities as $entity ) {
			if ( $entity['score'] < $threshold ) {
				// skip entities that don't pass relevance threshold
				continue;
			}

			$synonyms = array_merge(
				$synonyms,
				array_fill_keys( $entity['synonyms'] ?? [], $entity['score'] )
			);
		}

		return $synonyms;
	}
}
