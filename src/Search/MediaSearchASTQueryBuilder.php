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

	/** @var float[] */
	private $searchProperties;

	/** @var array[] */
	private $stemmingSettings;

	/** @var string[] */
	private $languages;

	/** @var float[] */
	private $boosts;

	/** @var float[] */
	private $decays;

	/** @var array */
	private $options;

	/**
	 * @param MediaSearchASTEntitiesExtractor $entitiesExtractor
	 * @param float[] $searchProperties Properties to search statements in ([ propertyId => weight ])
	 * @param array[] $stemmingSettings Stemming settings (see $wgWBCSUseStemming)
	 * @param string[] $languages Languages to search text in
	 * @param array[] $settings Optional weight/decay overrides, plus some options
	 */
	public function __construct(
		MediaSearchASTEntitiesExtractor $entitiesExtractor,
		array $searchProperties,
		array $stemmingSettings,
		array $languages,
		array $settings = []
	) {
		$this->entitiesExtractor = $entitiesExtractor;
		$this->searchProperties = $searchProperties;
		$this->stemmingSettings = $stemmingSettings;
		$this->languages = $languages;
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
		];
		$this->options = [
			'normalizeFulltextScores' => (bool)( $settings['normalizeFulltextScores'] ?? true ),
			'normalizeMultiClauseScores' => (bool)( $settings['normalizeMultiClauseScores'] ?? false ),
			'hasLtrPlugin' => (bool)( $settings['hasLtrPlugin'] ?? false ),
			'entitiesVariableBoost' => (bool)( $settings['entitiesVariableBoost'] ?? true ),
			'applyLogisticFunction' => (bool)( $settings['applyLogisticFunction'] ?? false ),
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
		$nodeHandler = new WordsQueryNodeHandler(
			$node,
			$this->getWikibaseEntitiesHandler( $node ),
			$this->languages,
			$this->stemmingSettings,
			$this->boosts,
			$this->decays,
			$this->options
		);
		$this->map[$node] = $this->applyLogisticFunction( $nodeHandler->transform() );
	}

	public function visitPhraseQueryNode( PhraseQueryNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'PhraseQueryNode not (yet) supported.' );
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
			$this->searchProperties,
			$this->boosts,
			$this->options['entitiesVariableBoost']
		);
	}
}
