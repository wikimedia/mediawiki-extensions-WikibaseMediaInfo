<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\SearchConfig;
use MediaWiki\MediaWikiServices;
use MediaWiki\Sparql\SparqlClient;
use MWException;
use RequestContext;
use Wikibase\Repo\WikibaseRepo;

/**
 * This is a bit of a hack, turning a closure (or any callable) into
 * an invokable anonymous function.
 * It'll execute the callable just the same, but it also has a
 * __toString, which will allow ApiResult::validateValue (used in
 * ConfigDump to format this) to process the closure (which it is
 * otherwise unable to do)
 *
 * @param callable $callable
 * @return callable
 */
function closureToAnonymousClass( callable $callable ) {
	return new class ( $callable ) {
		/** @var callable $callable */
		private $callable;

		public function __construct( callable $callable ) {
			$this->callable = $callable;
		}

		public function __invoke() {
			return call_user_func_array( $this->callable, func_get_args() );
		}

		public function __toString() {
			return self::class;
		}
	};
}

// Search profiles for fulltext search
// Matches the syntax of Cirrus search profiles, e.g. in FullTextQueryBuilderProfiles.config.php
// Note that these will be merged with Cirrus standard profiles,
// so prefixing with 'mediainfo' is recommended.
return [
	MediaSearchQueryBuilder::FULLTEXT_PROFILE_NAME => [
		'builder_factory' => closureToAnonymousClass( function ( array $settings ) {
			$repo = WikibaseRepo::getDefaultInstance();
			$languageCode = $repo->getUserLanguage()->getCode();
			$languageFallbackChain = $repo->getLanguageFallbackChainFactory()->newFromLanguageCode( $languageCode );

			$mwServices = MediaWikiServices::getInstance();
			$config = $mwServices->getMainConfig();
			$configFactory = $mwServices->getConfigFactory();
			$searchConfig = $configFactory->makeConfig( 'CirrusSearch' );
			if ( !$searchConfig instanceof SearchConfig ) {
				throw new MWException( 'CirrusSearch config must be instanceof SearchConfig' );
			}
			$features = ( new FullTextKeywordRegistry( $searchConfig ) )->getKeywords();

			$searchProperties = $config->get( 'MediaInfoMediaSearchProperties' );
			if ( $searchProperties === null ) {
				$searchProperties = array_fill_keys( array_values( $config->get( 'MediaInfoProperties' ) ), 1 );
			}

			$languages = array_merge( [ $languageCode ], $languageFallbackChain->getFetchLanguageCodes() );
			$languages = array_unique( $languages );

			$entitiesFetcher = new MediaSearchMemoryEntitiesFetcher(
				new MediaSearchCachingEntitiesFetcher(
					new MediaSearchEntitiesFetcher(
						$mwServices->getHttpRequestFactory()->createMultiClient(),
						$config->get( 'MediaInfoExternalEntitySearchBaseUri' ),
						$languageCode
					),
					$mwServices->getMainWANObjectCache()
				)
			);

			// allow settings (boost etc.) to be customized from URL query params
			foreach ( RequestContext::getMain()->getRequest()->getQueryValues() as $key => $value ) {
				// convert [ 'one:two' => 'three' ] into ['one']['two'] = 'three'
				$flat = array_merge( explode( ':', $key ), [ floatval( $value ) ] );
				$result = array_reduce(
					array_reverse( $flat ),
					function ( $previous, $key ) {
						return $previous !== null ? [ $key => $previous ] : $key;
					},
					null
				);
				$settings = array_replace_recursive( $settings, $result );
			}
			// work around '.' being replaced by '_'
			if ( isset( $settings['boost']['redirect_title'] ) ) {
				$settings['boost']['redirect.title'] = $settings['boost']['redirect_title'];
				unset( $settings['boost']['redirect_title'] );
			}

			return new MediaSearchQueryBuilder(
				$features,
				new MediaSearchASTQueryBuilder(
					new MediaSearchASTEntitiesExtractor( $entitiesFetcher ),
					$searchProperties,
					$configFactory->makeConfig( 'WikibaseCirrusSearch' )->get( 'UseStemming' ),
					$languages,
					$settings
				)
			);
		} ),
		'settings' => [
			'boost' => [
				'statement' => 5.0,
				'descriptions' => 1.0,
				'title' => 0.3,
				'category' => 0.05,
				'heading' => 0.05,
				'auxiliary_text' => 0.05,
				'file_text' => 0.5,
				'redirect.title' => 0.27,
				'suggest' => 0.06,
				'text' => 0.6,
			],
			'decay' => [
				'descriptions' => 0.9,
			],
		],
	],
	'mediainfo_fulltext_experimental' => [
		'builder_factory' => closureToAnonymousClass( function ( array $settings ) {
			$repo = WikibaseRepo::getDefaultInstance();
			$languageCode = $repo->getUserLanguage()->getCode();
			$languageFallbackChain = $repo->getLanguageFallbackChainFactory()->newFromLanguageCode( $languageCode );

			$mwServices = MediaWikiServices::getInstance();
			$httpRequestFactory = $mwServices->getHttpRequestFactory();
			$config = $mwServices->getMainConfig();
			$configFactory = $mwServices->getConfigFactory();
			$searchConfig = $configFactory->makeConfig( 'CirrusSearch' );
			if ( !$searchConfig instanceof SearchConfig ) {
				throw new MWException( 'CirrusSearch config must be instanceof SearchConfig' );
			}
			$features = ( new FullTextKeywordRegistry( $searchConfig ) )->getKeywords();

			$searchProperties = $config->get( 'MediaInfoMediaSearchProperties' );
			if ( $searchProperties === null ) {
				$searchProperties = array_fill_keys( array_values( $config->get( 'MediaInfoProperties' ) ), 1 );
			}

			$languages = array_merge( [ $languageCode ], $languageFallbackChain->getFetchLanguageCodes() );
			$languages = array_unique( $languages );

			$sparqlClient = new SparqlClient(
				$config->get( 'MediaInfoMediaSearchEntitiesSparqlEndpointUri' ),
				$httpRequestFactory
			);
			$sparqlClient->setTimeout( 5 * 60 );
			$sparqlClient->setClientOptions( [ 'userAgent' => 'WikibaseMediaInfo media search tree traversal' ] );

			$entitiesFetcher = new MediaSearchMemoryEntitiesFetcher(
				new MediaSearchExperimentalEntityTraversingEntitiesFetcher(
					new MediaSearchEntitiesFetcher(
						$httpRequestFactory->createMultiClient(),
						$config->get( 'MediaInfoExternalEntitySearchBaseUri' ),
						$languageCode
					),
					$sparqlClient,
					$languageCode,
					$searchProperties
				)
			);

			return new MediaSearchQueryBuilder(
				$features,
				new MediaSearchASTQueryBuilder(
					new MediaSearchASTEntitiesExtractor( $entitiesFetcher ),
					$searchProperties,
					$configFactory->makeConfig( 'WikibaseCirrusSearch' )->get( 'UseStemming' ),
					$languages,
					$settings
				)
			);
		} ),
		'settings' => [
			'boost' => [
				'statement' => 5.0,
				'descriptions' => 1.0,
				'title' => 0.3,
				'category' => 0.05,
				'heading' => 0.05,
				'auxiliary_text' => 0.05,
				'file_text' => 0.5,
				'redirect.title' => 0.27,
				'suggest' => 0.06,
				'text' => 0.6,
			],
			'decay' => [
				'descriptions' => 0.9,
			],
		],
	],
];
