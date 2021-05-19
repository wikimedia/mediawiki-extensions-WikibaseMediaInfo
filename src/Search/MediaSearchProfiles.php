<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\SearchConfig;
use MediaWiki\MediaWikiServices;
use MWException;
use RequestContext;
use Wikibase\Repo\WikibaseRepo;

if ( !function_exists( 'Wikibase\MediaInfo\Search\closureToAnonymousClass' ) ) {
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
}

// Search profiles for fulltext search
// Matches the syntax of Cirrus search profiles, e.g. in FullTextQueryBuilderProfiles.config.php
// Note that these will be merged with Cirrus standard profiles,
// so prefixing with 'mediainfo' is recommended.
return [
	MediaSearchQueryBuilder::FULLTEXT_PROFILE_NAME => [
		'builder_factory' => closureToAnonymousClass( static function ( array $settings ) {
			$languageCode = WikibaseRepo::getUserLanguage()->getCode();
			$languageFallbackChain = WikibaseRepo::getLanguageFallbackChainFactory()
				->newFromLanguageCode( $languageCode );

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
					static function ( $previous, $key ) {
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

			$settings['hasLtrPlugin'] = $config->get( 'MediaInfoMediaSearchHasLtrPlugin' );

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
				'descriptions.$language' => 3.0,
				'descriptions.$language.plain' => 1.0,
				'title' => 0.9,
				'title.plain' => 0.3,
				'category' => 0.15,
				'category.plain' => 0.05,
				'heading' => 0.15,
				'heading.plain' => 0.05,
				'auxiliary_text' => 0.15,
				'auxiliary_text.plain' => 0.05,
				'file_text' => 1.5,
				'file_text.plain' => 0.5,
				'redirect.title' => 0.81,
				'redirect.title.plain' => 0.27,
				'text' => 1.8,
				'text.plain' => 0.6,
				'suggest' => 0.18,
			],
			'decay' => [
				'descriptions.$language' => 0.9,
				'descriptions.$language.plain' => 0.9,
			],
			'normalizeFulltextScores' => true,
			'normalizeMultiClauseScores' => false,
			'entitiesVariableBoost' => true,
			'applyLogisticFunction' => false,
			'logisticRegressionIntercept' => 0,
		],
	],
	'mediasearch_logistic_regression' => [
		'builder_factory' => closureToAnonymousClass( static function ( array $settings ) {
			$languageCode = WikibaseRepo::getUserLanguage()->getCode();
			$languageFallbackChain = WikibaseRepo::getLanguageFallbackChainFactory()
				->newFromLanguageCode( $languageCode );

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
					static function ( $previous, $key ) {
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

			$settings['hasLtrPlugin'] = $config->get( 'MediaInfoMediaSearchHasLtrPlugin' );

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
				'statement' => 0.11098311564161133,
				'descriptions.$language' => 0.019320230186222098,
				'descriptions.$language.plain' => 0,
				'title' => 0.0702949038300864,
				'title.plain' => 0,
				'category' => 0.05158078808882278,
				'category.plain' => 0,
				'heading' => 0,
				'heading.plain' => 0,
				// Arbitrary small value to preserve ordering if we ONLY have a match in this field
				'auxiliary_text' => 0.0001,
				'auxiliary_text.plain' => 0,
				'file_text' => 0,
				'file_text.plain' => 0,
				'redirect.title' => 0.01060150471482338,
				'redirect.title.plain' => 0,
				// Arbitrary small value to preserve ordering if we ONLY have a match in this field
				'text' => 0.0001,
				'text.plain' => 0,
				'suggest' => 0,
			],
			'decay' => [
				'descriptions.$language' => 0.9,
				'descriptions.$language.plain' => 0.9,
			],
			'normalizeFulltextScores' => true,
			'normalizeMultiClauseScores' => true,
			'entitiesVariableBoost' => true,
			'applyLogisticFunction' => true,
			'logisticRegressionIntercept' => -1.1975600089068401,
		],
	],
];
