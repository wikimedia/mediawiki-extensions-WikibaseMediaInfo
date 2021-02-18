<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use CirrusSearch\CirrusSearch;
use CirrusSearch\CirrusSearchHookRunner;
use CirrusSearch\Parser\AST\ParsedQuery;
use CirrusSearch\Parser\NamespacePrefixParser;
use CirrusSearch\Search\SearchQueryBuilder;
use CirrusSearch\SearchConfig;
use Elastica\Query\BoolQuery;
use MediaWiki\HookContainer\HookContainer;
use MediaWikiIntegrationTestCase;
use Wikibase\MediaInfo\Search\MediaSearchASTEntitiesExtractor;
use Wikibase\MediaInfo\Search\MediaSearchASTQueryBuilder;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaSearchASTQueryBuilder
 */
class MediaSearchASTQueryBuilderTest extends MediaWikiIntegrationTestCase {
	private function createParsedQuery( $queryString ): ParsedQuery {
		$searchQueryBuilder = SearchQueryBuilder::newFTSearchQueryBuilder(
			new SearchConfig(),
			$queryString,
			new class() implements NamespacePrefixParser {
				public function parse( $query ) {
					return CirrusSearch::parseNamespacePrefixes( $query, true, true );
				}
			},
			new CirrusSearchHookRunner( $this->createMock( HookContainer::class ) )
		);
		$searchQuery = $searchQueryBuilder->build();

		return $searchQuery->getParsedQuery();
	}

	public function testGetQuery() {
		$parsedQuery = $this->createParsedQuery( 'cat AND dog' );

		$mockMediaSearchEntitiesFetcher = $this->createMock( MediaSearchEntitiesFetcher::class );
		$mockMediaSearchEntitiesFetcher->method( 'get' )
			->willReturn( [] );

		$builder = new MediaSearchASTQueryBuilder(
			new MediaSearchASTEntitiesExtractor( $mockMediaSearchEntitiesFetcher ),
			[],
			[],
			[],
			'',
			[]
		);

		$query = $builder->getQuery( $parsedQuery, $parsedQuery->getRoot() );
		$this->assertInstanceOf( BoolQuery::class, $query );
	}
}
