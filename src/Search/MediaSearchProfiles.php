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
	MediaSearchQueryBuilder::LOGREG_PROFILE_NAME => [
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
						$languageCode,
						$config->get( 'LanguageCode' )
					),
					$mwServices->getMainWANObjectCache(),
					$languageCode,
					$config->get( 'LanguageCode' ),
					'wbmi-mediasearch-entities'
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
					$config->get( 'LanguageCode' ),
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
				// below is not actually a field
				'synonyms' => 0,
			],
			'normalizeFulltextScores' => false,
			'normalizeMultiClauseScores' => true,
			'entitiesVariableBoost' => true,
			'applyLogisticFunction' => true,
			'useSynonyms' => false,
			'logisticRegressionIntercept' => -1.1975600089068401,
		],
	],
	MediaSearchQueryBuilder::SYNONYMS_PROFILE_NAME => [
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
						$languageCode,
						$config->get( 'LanguageCode' )
					),
					$mwServices->getMainWANObjectCache(),
					$languageCode,
					$config->get( 'LanguageCode' ),
					'wbmi-mediasearch-entities'
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
					$config->get( 'LanguageCode' ),
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
				// below is not actually a field
				'synonyms' => 0.5,
			],
			'normalizeFulltextScores' => false,
			'normalizeMultiClauseScores' => true,
			'entitiesVariableBoost' => true,
			'applyLogisticFunction' => true,
			'useSynonyms' => true,
			'logisticRegressionIntercept' => -1.1975600089068401,
		],
	],
	MediaSearchQueryBuilder::WEIGHTED_TAGS_PROFILE_NAME => [
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

			$httpEntitiesFetcher = new MediaSearchEntitiesFetcher(
				$mwServices->getHttpRequestFactory()->createMultiClient(),
				$config->get( 'MediaInfoExternalEntitySearchBaseUri' ),
				$languageCode,
				$config->get( 'LanguageCode' )
			);
			$titleMatchUrl = $config->get( 'MediaInfoMediaSearchTitleMatchBaseUri' );
			if ( $titleMatchUrl ) {
				$httpEntitiesFetcher->setTitleMatchUrl(
					sprintf( $titleMatchUrl, $languageCode )
				);
			}

			$entitiesFetcher = new MediaSearchMemoryEntitiesFetcher(
				new MediaSearchCachingEntitiesFetcher(
					$httpEntitiesFetcher,
					$mwServices->getMainWANObjectCache(),
					$languageCode,
					$config->get( 'LanguageCode' ),
					'wbmi-mediasearch-entities-titles'
				)
			);

			$settings['hasLtrPlugin'] = $config->get( 'MediaInfoMediaSearchHasLtrPlugin' );

			$queryBuilder = new MediaSearchQueryBuilder(
				$features,
				new MediaSearchASTQueryBuilder(
					new MediaSearchASTEntitiesExtractor( $entitiesFetcher ),
					$searchProperties,
					$configFactory->makeConfig( 'WikibaseCirrusSearch' )->get( 'UseStemming' ),
					$languages,
					$config->get( 'LanguageCode' ),
					$settings
				)
			);

			return $queryBuilder;
		} ),
		'settings' => [
			'boost' => [
				'statement' => 0.07820204273071839,
				'weighted_tags' => [
					// NOTE the 1000 * is because we haven't stored a score for this field in the
					// experimental search index, so it defaults to 1 which is transformed to
					// 0.001 by cirrussearch code
					// When we recreate the index on production we'll probably store a score of
					// 1000 for this field, and can remove the 1000 * here
					'image.linked.from.wikidata.p18/' => 1000 * 1.5653542537287244,
					'image.linked.from.wikidata.p373/' => 4.0424359988709435,
					'image.linked.from.wikidata.sitelink/' => 4.26335835247543,
				],
				'descriptions.$language' => 0.0392515093914008,
				'descriptions.$language.plain' => 0,
				'title' => 0.04487718624539365,
				'title.plain' => 0,
				'category' => 0.04321595766352061,
				'category.plain' => 0,
				'heading' => 0,
				'heading.plain' => 0,
				// Arbitrary small value to preserve ordering if we ONLY have a match in this field
				'auxiliary_text' => 0.0001,
				'auxiliary_text.plain' => 0,
				'file_text' => 0,
				'file_text.plain' => 0,
				'redirect.title' => 0.01997210246565096,
				'redirect.title.plain' => 0,
				// Arbitrary small value to preserve ordering if we ONLY have a match in this field
				'text' => 0.0001,
				'text.plain' => 0,
				'suggest' => 0.03278522607586197,
			],
			'decay' => [
				'descriptions.$language' => 0.9,
				'descriptions.$language.plain' => 0.9,
				// below is not actually a field
				'synonyms' => 0,
			],
			'normalizeFulltextScores' => true,
			'normalizeMultiClauseScores' => true,
			'entitiesVariableBoost' => true,
			'applyLogisticFunction' => true,
			'useSynonyms' => false,
			'logisticRegressionIntercept' => -1.4925851105992378,
		],
	],
];
