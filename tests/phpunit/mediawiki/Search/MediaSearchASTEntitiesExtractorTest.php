<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use CirrusSearch\CirrusSearch;
use CirrusSearch\CirrusSearchHookRunner;
use CirrusSearch\Parser\AST\ParsedQuery;
use CirrusSearch\Parser\NamespacePrefixParser;
use CirrusSearch\Search\SearchQueryBuilder;
use CirrusSearch\SearchConfig;
use MediaWiki\HookContainer\HookContainer;
use MediaWikiIntegrationTestCase;
use Wikibase\MediaInfo\Search\MediaSearchASTEntitiesExtractor;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaSearchASTEntitiesExtractor
 */
class MediaSearchASTEntitiesExtractorTest extends MediaWikiIntegrationTestCase {
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

	public static function provideTestGetEntities(): array {
		$query = 'cat AND dog OR goat NOT duck';
		$entities = [ 'cat' => [ 'P1', 'P2' ], 'dog' => [ 'P3' ], 'goat' => [] ];

		return [
			'multiple entities found' => [
				$query,
				0,
				$entities,
				[ 'P1', 'P2' ],
			],
			'one entity found' => [
				$query,
				1,
				$entities,
				[ 'P3' ],
			],
			'no entity found' => [
				$query,
				2,
				$entities,
				[],
			],
			"doesn't exist" => [
				$query,
				3,
				$entities,
				[],
			],
		];
	}

	/**
	 * @dataProvider provideTestGetEntities
	 */
	public function testGetEntities(
		string $query,
		int $clauseIndex,
		array $entities,
		array $expect
	) {
		$parsedQuery = $this->createParsedQuery( $query );
		$parsedNode = $parsedQuery->getRoot()->getClauses()[$clauseIndex]->getNode();

		$mockEntitiesFetcher = $this->createMock( MediaSearchEntitiesFetcher::class );
		$mockEntitiesFetcher->method( 'get' )->willReturn( $entities );

		$extractor = new MediaSearchASTEntitiesExtractor( $mockEntitiesFetcher );

		$entities = $extractor->getEntities( $parsedQuery, $parsedNode );
		$this->assertArrayEquals( $expect, $entities );
	}
}
