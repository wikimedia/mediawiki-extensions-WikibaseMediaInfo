<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\AST\EmptyQueryNode;
use CirrusSearch\Parser\AST\FuzzyNode;
use CirrusSearch\Parser\AST\KeywordFeatureNode;
use CirrusSearch\Parser\AST\ParsedQuery;
use CirrusSearch\Parser\AST\PhrasePrefixNode;
use CirrusSearch\Parser\AST\PhraseQueryNode;
use CirrusSearch\Parser\AST\PrefixNode;
use CirrusSearch\Parser\AST\Visitor\LeafVisitor;
use CirrusSearch\Parser\AST\WildcardNode;
use CirrusSearch\Parser\AST\WordsQueryNode;
use CirrusSearch\Parser\ParsedQueryClassifier;

class MediaSearchASTClassifier extends LeafVisitor implements ParsedQueryClassifier {
	/** @var string[] */
	private $profiles;

	/** @var string[] */
	private $supported = [];

	/** @var string[] */
	private $unsupported = [];

	/**
	 * @param string[] $profiles
	 */
	public function __construct( array $profiles = [] ) {
		parent::__construct();
		$this->profiles = $profiles;
	}

	/**
	 * @inheritDoc
	 */
	public function classify( ParsedQuery $query ) {
		$query->getRoot()->accept( $this );
		return array_diff( $this->supported, $this->unsupported );
	}

	/**
	 * @inheritDoc
	 */
	public function classes() {
		return $this->profiles;
	}

	/**
	 * @inheritDoc
	 */
	public function visitWordsQueryNode( WordsQueryNode $node ) {
		$this->supported = array_unique( array_merge( $this->supported, $this->profiles ) );
	}

	/**
	 * @inheritDoc
	 */
	public function visitPhraseQueryNode( PhraseQueryNode $node ) {
		$this->supported = array_unique( array_merge( $this->supported, $this->profiles ) );
	}

	/**
	 * @inheritDoc
	 */
	public function visitPhrasePrefixNode( PhrasePrefixNode $node ) {
		$this->unsupported = array_unique( array_merge( $this->unsupported, $this->profiles ) );
	}

	/**
	 * @inheritDoc
	 */
	public function visitFuzzyNode( FuzzyNode $node ) {
		$this->unsupported = array_unique( array_merge( $this->unsupported, $this->profiles ) );
	}

	/**
	 * @inheritDoc
	 */
	public function visitPrefixNode( PrefixNode $node ) {
		$this->unsupported = array_unique( array_merge( $this->unsupported, $this->profiles ) );
	}

	/**
	 * @inheritDoc
	 */
	public function visitWildcardNode( WildcardNode $node ) {
		$this->unsupported = array_unique( array_merge( $this->unsupported, $this->profiles ) );
	}

	/**
	 * @inheritDoc
	 */
	public function visitEmptyQueryNode( EmptyQueryNode $node ) {
		// not relevant here
	}

	/**
	 * @inheritDoc
	 */
	public function visitKeywordFeatureNode( KeywordFeatureNode $node ) {
		// not relevant here
	}
}
