<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Query\FullTextQueryBuilder;
use CirrusSearch\Query\KeywordFeature;
use CirrusSearch\Search\SearchContext;
use Elastica\Query\BoolQuery;

class MediaSearchQueryBuilder implements FullTextQueryBuilder {
	public const SEARCH_PROFILE_CONTEXT_NAME = 'mediasearch';

	/** @var KeywordFeature[] */
	private $features;

	/** @var MediaSearchASTQueryBuilder */
	protected $queryBuilder;

	/**
	 * @param KeywordFeature[] $features
	 * @param MediaSearchASTQueryBuilder $queryBuilder
	 */
	public function __construct(
		array $features,
		MediaSearchASTQueryBuilder $queryBuilder
	) {
		$this->features = $features;
		$this->queryBuilder = $queryBuilder;
	}

	/**
	 * Search articles with provided term.
	 *
	 * @param SearchContext $context
	 * @param string $term
	 */
	public function build( SearchContext $context, $term ) {
		foreach ( $this->features as $feature ) {
			$feature->apply( $context, $term );
		}

		$parsedQuery = $context->getSearchQuery()->getParsedQuery();
		$context->setMainQuery(
			( new BoolQuery() )
				->addMust( $this->queryBuilder->getQuery( $parsedQuery ) )
		);
	}

	public function buildDegraded( SearchContext $searchContext ): bool {
		return false;
	}
}
