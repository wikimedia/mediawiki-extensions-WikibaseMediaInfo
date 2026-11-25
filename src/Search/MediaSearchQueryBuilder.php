<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Query\FullTextQueryBuilder;
use CirrusSearch\Query\KeywordFeature;
use CirrusSearch\Search\SearchContext;
use Elastica\Query\BoolQuery;

class MediaSearchQueryBuilder implements FullTextQueryBuilder {
	public const SEARCH_PROFILE_CONTEXT_NAME = 'mediasearch';

	/**
	 * @param KeywordFeature[] $features
	 * @param MediaSearchASTQueryBuilder $queryBuilder
	 */
	public function __construct(
		private readonly array $features,
		protected readonly MediaSearchASTQueryBuilder $queryBuilder
	) {
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

		// record mediasearch as a type similar to CirrusSearch's full_text
		$context->addSyntaxUsed( self::SEARCH_PROFILE_CONTEXT_NAME, 10 );
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
