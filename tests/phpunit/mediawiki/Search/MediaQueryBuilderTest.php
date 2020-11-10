<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use CirrusSearch\HashSearchConfig;
use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\Search\SearchContext;
use CirrusSearch\SearchConfig;
use MediaWiki\MediaWikiServices;
use MediaWikiTestCase;
use Wikibase\Lib\LanguageFallbackChainFactory;
use Wikibase\Lib\TermLanguageFallbackChain;
use Wikibase\MediaInfo\Search\MediaQueryBuilder;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaQueryBuilder
 */
class MediaQueryBuilderTest extends MediaWikiTestCase {

	private function createSUT( array $params = [] ) : MediaQueryBuilder {
		$configFactory = MediaWikiServices::getInstance()->getConfigFactory();
		$features = ( new FullTextKeywordRegistry( $configFactory->makeConfig( 'CirrusSearch' ) ) )->getKeywords();
		$settings = $params['settings'] ?? [];
		$stemmingSettings = $params['stemmingSettings'] ?? [];
		$userLanguage = $params['userLanguage'] ?? 'en';
		$fallbackLangs = $params['fallbackLangs'] ?? [];
		$entityIds = $params['entityIdsForTerm'] ?? [];
		$defaultProperties = $params['defaultProperties'] ?? [];
		$fallbackChainFactory = $this->createMockFallbackChainFactory(
			$userLanguage,
			$fallbackLangs
		);
		$mockMediaSearchEntitiesFetcher = $this->createMockMediaSearchEntitiesFetcher( $entityIds );

		return new MediaQueryBuilder(
			new HashSearchConfig( [
				'CirrusSearchPhraseSlop' => [
					'precise' => 0,
					'default' => 0,
					'boost' => 1
				],
			] ),
			$features,
			$settings,
			$stemmingSettings,
			$userLanguage,
			array_fill_keys( $defaultProperties, 1 ),
			$mockMediaSearchEntitiesFetcher,
			$fallbackChainFactory
		);
	}

	private function createMockMediaSearchEntitiesFetcher( $entityIdsMap ) : MediaSearchEntitiesFetcher {
		$response = [];
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

	private function createMockFallbackChainFactory(
		string $languageCode,
		array $fallbackLangs
	) : LanguageFallbackChainFactory {
		$fallbackChain = $this->createMock( TermLanguageFallbackChain::class );
		$fallbackChain->method( 'getFetchLanguageCodes' )
			->willReturn( $fallbackLangs );
		$fallbackChainFactory = $this->createMock( LanguageFallbackChainFactory::class );
		$fallbackChainFactory->method( 'newFromLanguageCode' )
			->with( $languageCode )
			->willReturn( $fallbackChain );
		return $fallbackChainFactory;
	}

	private function createSearchContext() : SearchContext {
		return new SearchContext(
			new SearchConfig()
		);
	}

	public function testStaticConstruction() : void {
		$builder = MediaQueryBuilder::newFromGlobals( [] );
		$this->assertInstanceOf( MediaQueryBuilder::class, $builder );
	}

	/**
	 * @dataProvider searchDataProvider
	 * @param array $settings
	 * @param string $expectedFile
	 */
	public function testQuery( array $settings, string $expectedFile ) : void {
		$builder = $this->createSUT( $settings );
		$searchContext = $this->createSearchContext();
		$builder->build( $searchContext, $settings['term'] );

		$this->assertFileContains(
			$expectedFile,
			json_encode( $searchContext->getQuery()->toArray(), JSON_PRETTY_PRINT ),
			getenv( "MEDIAINFO_REBUILD_FIXTURES" ) === 'yes',
			$settings['title'] . ': failed'
		);
	}

	public function searchDataProvider() {
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
