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
			'normalizeMultiClauseScores' => (bool)( $settings['normalizeMultiClauseScores'] ?? false ),
			'entitiesVariableBoost' => (bool)( $settings['entitiesVariableBoost'] ?? true ),
			'applyLogisticFunction' => (bool)( $settings['applyLogisticFunction'] ?? false ),
			'useSynonyms' => (bool)( $settings['useSynonyms'] ?? false ),
			'logisticRegressionIntercept' => (float)( $settings['logisticRegressionIntercept'] ?? 0 ),
			'synonymsMaxAmount' => (float)( $settings['synonymsMaxAmount'] ?? 0 ),
			'synonymsMinScoreThreshold' => (float)( $settings['synonymsMinScoreThreshold'] ?? 0 ),
			'synonymsMinByteLength' => (float)( $settings['synonymsMinByteLength'] ?? 0 ),
			'synonymsMinSimilarityToCanonicalForm' => (float)( $settings['synonymsMinSimilarityToCanonicalForm'] ?? 0 ),
			'synonymsMinDifferenceFromOthers' => (float)( $settings['synonymsMinDifferenceFromOthers'] ?? 0 ),
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

		$should = $must = 0;
		foreach ( $node->getClauses() as $clause ) {
			$clauseNode = $clause->getNode();
			$clauseNode->accept( $this );
			if ( isset( $this->map[$clauseNode] ) ) {
				switch ( $clause->getOccur() ) {
					case BooleanClause::SHOULD:
						$query->addShould( $this->map[$clauseNode] );
						$should++;
						break;
					case BooleanClause::MUST:
						$query->addMust( $this->map[$clauseNode] );
						$must++;
						break;
					case BooleanClause::MUST_NOT:
						$query->addMustNot( $this->map[$clauseNode] );
						break;
				}
			}
		}
		if ( $should && !$must ) {
			// If we have must and should clauses allow 0 should clauses to match. If we
			// only have should clauses require at least 1 to match.
			$query->setMinimumShouldMatch( 1 );
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
			// the original term (below) will be removed again later, but we should
			// also consider it when clearing out synonyms that are too similar
			[ $node->getWords() => 10 ],
			$this->getSynonyms( $node, $this->options['synonymsMinScoreThreshold'] )
		);

		$synonyms = $this->filterTermsTooDissimilarCanonicalized(
			$synonyms,
			$this->options['synonymsMinSimilarityToCanonicalForm']
		);
		$synonyms = array_reduce(
			array_keys( $synonyms ),
			function ( $result, $term ) use ( $synonyms ) {
				$canonical = $this->canonicalizeTerm( $term );
				$result[$canonical] = max( $synonyms[$term], $result[$canonical] ?? 0 );
				return $result;
			},
			[]
		);
		$synonyms = $this->filterTermsTooShort( $synonyms, $this->options['synonymsMinByteLength'] );
		$synonyms = $this->filterTermsTooSimilar( $synonyms, $this->options['synonymsMinDifferenceFromOthers'] );
		$synonyms = $this->filterTermsSupersets( $synonyms );

		// remove original term (and duplicates thereof)
		unset( $synonyms[$this->canonicalizeTerm( $node->getWords() )] );

		$synonyms = array_slice( $synonyms, 0, $this->options['synonymsMaxAmount'] );

		$nodeHandler = new WordsQueryNodeHandler(
			$node,
			$this->getWikibaseEntitiesHandler( $node ),
			$this->languages,
			$synonyms,
			array_fill_keys( $synonyms, [ $this->contentLanguage ] ),
			$this->stemmingSettings,
			$this->boosts,
			$this->decays
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
	private function getSynonyms( WordsQueryNode $node, float $threshold = 0.5 ): array {
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

	private function canonicalizeTerm( string $term ): string {
		$canonical = strtolower( $term );
		// replace punctuation (\p{P}) and separators (\p{Z}) by a single space
		$canonical = preg_replace( '/[\p{P}\p{Z}]+/u', ' ', $canonical );
		return trim( $canonical );
	}

	private function filterTermsTooShort( array $synonyms, int $threshold ): array {
		// remove variations, preserving the highest value in case of duplicates
		return array_filter(
			$synonyms,
			static function ( $term ) use ( $threshold ) {
				// discard 1-letter latin characters - they're too generic & expensive
				return strlen( $term ) >= $threshold;
			},
			ARRAY_FILTER_USE_KEY
		);
	}

	private function filterTermsTooDissimilarCanonicalized( array $synonyms, float $threshold ): array {
		// remove variations, preserving the highest value in case of duplicates
		return array_filter(
			$synonyms,
			function ( $term ) use ( $threshold ) {
				$canonical = $this->canonicalizeTerm( $term );
				// discard terms where a significant portion was punctuation or separators,
				// the canonical form likely is no longer representative enough (e.g `c#` != `c`)
				// @phan-suppress-next-line PhanPluginUseReturnValueInternalKnown
				similar_text( strtolower( $canonical ), strtolower( $term ), $similarity );
				return $similarity / 100 >= $threshold;
			},
			ARRAY_FILTER_USE_KEY
		);
	}

	private function filterTermsTooSimilar( array $synonyms, float $threshold ): array {
		// now calculate the similarity to other terms (with same or higher weight)
		// and get rid of terms that are simply too similar (e.g. 'cat' and 'cats',
		// or 'house cat' and 'housecat' are too similar; we'd rather spend our
		// resources looking for more significantly different terms)
		$terms = array_keys( $synonyms );
		$differences = [];
		foreach ( $synonyms as $term => $score ) {
			$index = array_search( $term, $terms );
			$previousTerms = array_slice( $terms, 0, $index );
			$differences[$term] = array_reduce(
				$previousTerms,
				static function ( $min, $otherTerm ) use ( $term ) {
					// @phan-suppress-next-line PhanPluginUseReturnValueInternalKnown
					similar_text( strtolower( $term ), strtolower( $otherTerm ), $similarity );
					$difference = 1 - $similarity / 100;
					return $min === null ? $difference : min( $min, $difference );
				},
				null
			);
			if ( $differences[$term] !== null && $differences[$term] < $threshold ) {
				unset( $synonyms[$term] );
			}
		}

		// now re-sort them by difference compared to other terms (by weight),
		// so that we get the "more different" terms first; then sort by weight
		// again so that we end up with an array sorted by weight first, and
		// "different-ness" second
		uksort( $synonyms, static function ( $a, $b ) use ( $differences ) {
			return $differences[ $b ] <=> $differences[ $a ];
		} );
		arsort( $synonyms );

		return $synonyms;
	}

	private function filterTermsSupersets( array $synonyms ): array {
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
		return array_reduce(
			array_keys( $synonyms ),
			static function ( $result, $term ) use ( $synonyms ) {
				foreach ( $result as $existing => $weight ) {
					if ( preg_match_all( '/\b[^\p{P}\p{Z}]+?\b/u', $existing, $matches ) ) {
						foreach ( $matches[0] as $word ) {
							if ( !preg_match( '/\b' . preg_quote( $word, '/' ) . '\b/', $term ) ) {
								// at least one of the words of another synonym do not
								// occur in this term, so it's at least more exclusive
								// in some way = this term is no superset of that other
								continue 2;
							}
						}
						// another term of equal or higher weight already matches this
						return $result;
					}
				}
				// this synonym turned out to be different enough from all others;
				// include it
				$result[$term] = $synonyms[$term];
				return $result;
			},
			[]
		);
	}

}
