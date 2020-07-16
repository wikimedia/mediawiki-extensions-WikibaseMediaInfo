<?php

namespace Wikibase\MediaInfo\Tests\Unit\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\Search\SearchContext;
use CirrusSearch\SearchConfig;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MediaWikiServices;
use PHPUnit\Framework\TestCase;
use Wikibase\Lib\LanguageFallbackChainFactory;
use Wikibase\Lib\TermLanguageFallbackChain;
use Wikibase\MediaInfo\Search\MediaQueryBuilder;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaQueryBuilder
 */
class MediaQueryBuilderTest extends TestCase {

	private function createSUT( array $params = [] ) : MediaQueryBuilder {
		$configFactory = MediaWikiServices::getInstance()->getConfigFactory();
		$features = ( new FullTextKeywordRegistry( $configFactory->makeConfig( 'CirrusSearch' ) ) )->getKeywords();
		$term = $params['term'] ?? 'test_search_term';
		$settings = $params['settings'] ?? [];
		$stemmingSettings = $params['stemmingSettings'] ?? [];
		$userLanguage = $params['userLanguage'] ?? 'en';
		$fallbackLangs = $params['fallbackLangs'] ?? [];
		$entityIds = $params['entityIdsForTerm'] ?? [];
		$defaultProperties = $params['defaultProperties'] ?? [];
		$externalEntitySearchBaseUri = 'http://example.com/';
		$httpRequestFactory = $this->createMockHttpFactory(
			// strip filters from the search input
			preg_replace( '/\s+[^\s]+:[^\s]+/i', '', $term ),
			$entityIds,
			$externalEntitySearchBaseUri
		);
		$fallbackChainFactory = $this->createMockFallbackChainFactory(
			$userLanguage,
			$fallbackLangs
		);

		return new MediaQueryBuilder(
			$features,
			$settings,
			$stemmingSettings,
			$userLanguage,
			$httpRequestFactory,
			$defaultProperties,
			$externalEntitySearchBaseUri,
			$fallbackChainFactory
		);
	}

	private function createMockHttpFactory(
		$term,
		$idsToReturn,
		$uriBase
	) : HttpRequestFactory {
		$requestResponse = [];
		foreach ( $idsToReturn as $revId => $entityId ) {
			$requestResponse['query']['search'][] = [
				'title' => $entityId,
				'titlesnippet' => "<span class=\"searchmatch\">$term</span>",
				'snippet' => "$term",
			];
		}
		if ( count( $idsToReturn ) > 0 ) {
			// Add an extra match with a partially matching, less relevant term
			$requestResponse['query']['search'][] = [
				'title' => 'Q999999',
				'titlesnippet' => 'XXX',
				'snippet' => "<span class=\"searchmatch\">$term</span> XXX",
			];
		}

		$request = $this->createMock( \MWHttpRequest::class );
		$request->method( 'getContent' )
			->willReturn(
				json_encode( $requestResponse )
			);
		$requestFactory = $this->createMock( HttpRequestFactory::class );
		$requestFactory->method( 'create' )
			->with( $this->callback( function ( $arg ) use ( $term, $uriBase ) {
				return (bool)preg_match(
					'@^' . preg_quote( $uriBase ) . '.*' . preg_quote( urlencode( $term ) ) . '@',
					$arg
				);
			} ) )
			->willReturn( $request );

		return $requestFactory;
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
	 * @param array $expected
	 */
	public function testQuery( array $settings, array $expected ) : void {
		$builder = $this->createSUT( $settings );
		$searchContext = $this->createSearchContext();
		$builder->build( $searchContext, $settings['term'] );

		$this->assertEquals(
			$expected,
			$searchContext->getQuery()->toArray(),
			$settings['title'] . ': failed'
		);
	}

	public function searchDataProvider() {
		$fixturesDir = __DIR__ . '/../../data/queries/';
		$tests = [];
		foreach ( glob( $fixturesDir . '*.settings' ) as $settingsFile ) {
			$testFileName = substr( $settingsFile, 0, - 9 );
			$settings = json_decode( file_get_contents( $settingsFile ), true );
			$expectedFile = "$testFileName.expected";
			$expected = json_decode( file_get_contents( $expectedFile ), true );
			$tests[$settings['title']] = [ $settings, $expected ];
		}

		return $tests;
	}
}
