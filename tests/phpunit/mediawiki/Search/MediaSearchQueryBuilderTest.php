<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use CirrusSearch\CirrusSearch;
use CirrusSearch\CirrusSearchHookRunner;
use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\Parser\NamespacePrefixParser;
use CirrusSearch\Search\SearchContext;
use CirrusSearch\Search\SearchQueryBuilder;
use CirrusSearch\SearchConfig;
use MediaWiki\HookContainer\HookContainer;
use MediaWikiIntegrationTestCase;
use Wikibase\MediaInfo\Search\MediaSearchASTEntitiesExtractor;
use Wikibase\MediaInfo\Search\MediaSearchASTQueryBuilder;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;
use Wikibase\MediaInfo\Search\MediaSearchQueryBuilder;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaSearchQueryBuilder
 */
class MediaSearchQueryBuilderTest extends MediaWikiIntegrationTestCase {
	private function createSUT( array $params = [] ): MediaSearchQueryBuilder {
		$searchConfig = $this->createMock( SearchConfig::class );
		$features = ( new FullTextKeywordRegistry( $searchConfig ) )->getKeywords();
		$settings = $params['settings'] ?? [];
		$stemmingSettings = $params['stemmingSettings'] ?? [];
		$userLanguage = $params['userLanguage'] ?? 'en';
		$fallbackLangs = $params['fallbackLangs'] ?? [];
		$entityIds = $params['entityIdsForTerm'] ?? [];
		$defaultProperties = $params['defaultProperties'] ?? [];
		$mockMediaSearchEntitiesFetcher = $this->createMockMediaSearchEntitiesFetcher( $entityIds );

		return new MediaSearchQueryBuilder(
			$features,
			new MediaSearchASTQueryBuilder(
				new MediaSearchASTEntitiesExtractor( $mockMediaSearchEntitiesFetcher ),
				array_fill_keys( $defaultProperties, 1 ),
				$stemmingSettings,
				array_merge( [ $userLanguage ], $fallbackLangs ),
				$settings + [
					'hasLtrPlugin' => true,
					'applyLogisticFunction' => true,
					'logisticRegressionIntercept' => 1,
				]
			)
		);
	}

	private function createMockMediaSearchEntitiesFetcher( $entityIdsMap ): MediaSearchEntitiesFetcher {
		$response = [];
		// transform the simple array of ids into a similar ['entityId' => ..., 'score' => ...]
		// structure that actual entities fetcher otherwise derives from the API result
		foreach ( $entityIdsMap as $term => $entityIds ) {
			foreach ( $entityIds as $index => $entityId ) {
				$response[$term][] = [
					'entityId' => $entityId,
					'score' => 1 / ( $index + 1 ),
				];
			}
		}

		$mockEntitiesFetcher = $this->createMock( MediaSearchEntitiesFetcher::class );
		$mockEntitiesFetcher->method( 'get' )
			->willReturn( $response );
		return $mockEntitiesFetcher;
	}

	private function createSearchContext( $queryString ): SearchContext {
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
		return SearchContext::fromSearchQuery( $searchQuery );
	}

	/**
	 * @dataProvider provideTestQuery
	 * @param array $settings
	 * @param string $expectedFile
	 */
	public function testQuery( array $settings, string $expectedFile ): void {
		$builder = $this->createSUT( $settings );
		$searchContext = $this->createSearchContext( $settings['term'] );
		$builder->build( $searchContext, $settings['term'] );

		$this->assertFileContains(
			$expectedFile,
			json_encode( $searchContext->getQuery()->toArray(), JSON_PRETTY_PRINT ),
			getenv( 'MEDIAINFO_REBUILD_FIXTURES' ) === 'yes',
			$settings['title'] . ': failed'
		);
	}

	public function provideTestQuery() {
		$fixturesDir = __DIR__ . '/../../data/queries/';
		$tests = [];
		foreach ( glob( $fixturesDir . '*.settings' ) as $settingsFile ) {
			$testFileName = substr( $settingsFile, 0, -9 );
			$settings = json_decode( file_get_contents( $settingsFile ), true );
			$expectedFile = "$testFileName.expected";
			$tests[$settings['title']] = [ $settings, $expectedFile ];
		}

		return $tests;
	}
}
