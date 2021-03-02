<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\AST\EmptyQueryNode;
use CirrusSearch\Parser\AST\FuzzyNode;
use CirrusSearch\Parser\AST\KeywordFeatureNode;
use CirrusSearch\Parser\AST\ParsedNode;
use CirrusSearch\Parser\AST\ParsedQuery;
use CirrusSearch\Parser\AST\PhrasePrefixNode;
use CirrusSearch\Parser\AST\PhraseQueryNode;
use CirrusSearch\Parser\AST\PrefixNode;
use CirrusSearch\Parser\AST\Visitor\LeafVisitor;
use CirrusSearch\Parser\AST\WildcardNode;
use CirrusSearch\Parser\AST\WordsQueryNode;
use SplObjectStorage;

/**
 * This visitor simply extracts all individual search terms out of
 * a query that might contain multiple clauses (AND, OR, ...) so that
 * we can look them all up individually to fetch relevant entities.
 */
class MediaSearchASTEntitiesExtractor extends LeafVisitor {
	/** @var ParsedQuery */
	private $parsedQuery;

	/** @var MediaSearchEntitiesFetcher */
	private $entitiesFetcher;

	/** @var SplObjectStorage */
	private $terms;

	/** @var SplObjectStorage */
	private $entities;

	public function __construct( MediaSearchEntitiesFetcher $entitiesFetcher ) {
		parent::__construct();
		$this->entitiesFetcher = $entitiesFetcher;
	}

	public function getEntities( ParsedQuery $parsedQuery, ParsedNode $parsedNode ): array {
		if ( !isset( $this->entities[$parsedQuery] ) ) {
			// walk the AST and extract all terms
			$terms = $this->getTerms( $parsedQuery );
			// then fetch entities for all of them
			// re-init entities map; runtime code will usually only have only 1 query,
			// but tests might execute plenty & we don't want to keep results for an
			// entire suite in memory
			$this->entities = new SplObjectStorage();
			$this->entities[$parsedQuery] = $this->entitiesFetcher->get( $terms );
		}

		if ( !isset( $this->terms[$parsedNode] ) ) {
			return [];
		}

		$term = $this->terms[$parsedNode];
		if ( !isset( $this->entities[$parsedQuery][$term] ) ) {
			return [];
		}

		return $this->entities[$parsedQuery][$term];
	}

	private function getTerms( ParsedQuery $parsedQuery ): array {
		$this->terms = new SplObjectStorage();
		$this->parsedQuery = $parsedQuery;
		$this->parsedQuery->getRoot()->accept( $this );

		$terms = [];
		foreach ( $this->terms as $node ) {
			$terms[] = $this->terms[$node];
		}

		return $terms;
	}

	private function getTerm( ParsedNode $node ): string {
		return substr(
			$this->parsedQuery->getQuery(),
			$node->getStartOffset(),
			$node->getEndOffset() - $node->getStartOffset()
		);
	}

	/**
	 * @inheritDoc
	 */
	public function visitWordsQueryNode( WordsQueryNode $node ) {
		$this->terms[$node] = $this->getTerm( $node );
	}

	/**
	 * @inheritDoc
	 */
	public function visitPhraseQueryNode( PhraseQueryNode $node ) {
		$this->terms[$node] = $this->getTerm( $node );
	}

	/**
	 * @inheritDoc
	 */
	public function visitPhrasePrefixNode( PhrasePrefixNode $node ) {
		// @todo implement this
		// $this->terms[$node] = $this->getTerm( $node );
	}

	/**
	 * @inheritDoc
	 */
	public function visitFuzzyNode( FuzzyNode $node ) {
		// @todo implement this
		// $this->terms[$node] = $this->getTerm( $node );
	}

	/**
	 * @inheritDoc
	 */
	public function visitPrefixNode( PrefixNode $node ) {
		// @todo implement this
		// $this->terms[$node] = $this->getTerm( $node );
	}

	/**
	 * @inheritDoc
	 */
	public function visitWildcardNode( WildcardNode $node ) {
		// @todo implement this
		// $this->terms[$node] = $this->getTerm( $node );
	}

	/**
	 * @inheritDoc
	 */
	public function visitEmptyQueryNode( EmptyQueryNode $node ) {
		// @todo implement this
		// $this->terms[$node] = $this->getTerm( $node );
	}

	/**
	 * @inheritDoc
	 */
	public function visitKeywordFeatureNode( KeywordFeatureNode $node ) {
		// not relevant here
	}
}
