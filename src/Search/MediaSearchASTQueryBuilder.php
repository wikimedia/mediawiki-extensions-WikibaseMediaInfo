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
use Elastica\Query\MatchNone;
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

	/** @var bool */
	private $normalizeFulltextScores;

	/** @var bool */
	private $hasLtrPlugin;

	/**
	 * @param MediaSearchASTEntitiesExtractor $entitiesExtractor
	 * @param float[] $searchProperties Properties to search statements in ([ propertyId => weight ])
	 * @param array[] $stemmingSettings Stemming settings (see $wgWBCSUseStemming)
	 * @param string[] $languages Languages to search text in
	 * @param array[] $settings Optional weight/decay overrides
	 * @param bool $hasLtrPlugin Optional weight/decay overrides
	 */
	public function __construct(
		MediaSearchASTEntitiesExtractor $entitiesExtractor,
		array $searchProperties,
		array $stemmingSettings,
		array $languages,
		array $settings = [],
		bool $hasLtrPlugin = false
	) {
		$this->entitiesExtractor = $entitiesExtractor;
		$this->searchProperties = $searchProperties;
		$this->stemmingSettings = $stemmingSettings;
		$this->languages = $languages;
		$this->boosts = ( $settings['boost'] ?? [] ) + [
			'statement' => 1.0,
			'descriptions' => 1.0,
			'title' => 1.0,
			'category' => 1.0,
			'heading' => 1.0,
			'auxiliary_text' => 1.0,
			'file_text' => 1.0,
			'redirect.title' => 1.0,
			'suggest' => 1.0,
			'text' => 1.0,
		];
		$this->decays = ( $settings['decay'] ?? [] ) + [
			'descriptions' => 1.0,
		];
		$this->normalizeFulltextScores = (bool)( $settings['normalizeFulltextScores'] ?? true );
		$this->hasLtrPlugin = $hasLtrPlugin;
	}

	public function getQuery( ParsedQuery $parsedQuery ): AbstractQuery {
		$this->map = new SplObjectStorage();
		$this->parsedQuery = $parsedQuery;
		$root = $parsedQuery->getRoot();
		$root->accept( $this );
		return $this->map[$root] ?? new MatchNone();
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
			$this->hasLtrPlugin
		);
		$this->map[$node] = $nodeHandler->transform();
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
			$this->boosts
		);
	}
}
