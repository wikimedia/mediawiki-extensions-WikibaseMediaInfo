<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use CirrusSearch\CirrusSearch;
use CirrusSearch\CirrusSearchHookRunner;
use CirrusSearch\Parser\AST\ParsedNode;
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

	public function provideTestGetEntities(): array {
		$query = $this->createParsedQuery( 'cat AND dog OR goat NOT duck' );
		$entities = [ 'cat' => [ 'P1', 'P2' ], 'dog' => [ 'P3' ], 'goat' => [] ];

		return [
			'multiple entities found' => [
				$query,
				$query->getRoot()->getClauses()[0]->getNode(),
				$entities,
				[ 'P1', 'P2' ],
			],
			'one entity found' => [
				$query,
				$query->getRoot()->getClauses()[1]->getNode(),
				$entities,
				[ 'P3' ],
			],
			'no entity found' => [
				$query,
				$query->getRoot()->getClauses()[2]->getNode(),
				$entities,
				[],
			],
			"doesn't exist" => [
				$query,
				$query->getRoot()->getClauses()[3]->getNode(),
				$entities,
				[],
			],
		];
	}

	/**
	 * @dataProvider provideTestGetEntities
	 * @param ParsedQuery $parsedQuery
	 * @param ParsedNode $parsedNode
	 * @param array $entities
	 * @param array $expect
	 */
	public function testGetEntities(
		ParsedQuery $parsedQuery,
		ParsedNode $parsedNode,
		array $entities,
		array $expect
	) {
		$mockEntitiesFetcher = $this->createMock( MediaSearchEntitiesFetcher::class );
		$mockEntitiesFetcher->method( 'get' )->willReturn( $entities );

		$extractor = new MediaSearchASTEntitiesExtractor( $mockEntitiesFetcher );

		$entities = $extractor->getEntities( $parsedQuery, $parsedNode );
		$this->assertArrayEquals( $expect, $entities );
	}
}
