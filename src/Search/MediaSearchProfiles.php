<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\SearchConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\MediaWikiServices;
use UnexpectedValueException;
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

			public function __invoke( ...$args ) {
				return ( $this->callable )( ...$args );
			}

			public function __toString() {
				return self::class;
			}
		};
	}
}

$mwServices = MediaWikiServices::getInstance();
$config = $mwServices->getMainConfig();
$profiles = $config->get( 'MediaInfoMediaSearchProfiles' ) ?: [];

return array_map( static function ( array $settings ) use ( $config ) {
	// parse default settings into profile settings, to ensure all expected
	// settings have some (default) value if not explicitly specified
	$defaultSettings = [
		'boost' => [
			'statement' => array_fill_keys( array_values( $config->get( 'MediaInfoProperties' ) ), 1 ),
			'weighted_tags' => [],
			'descriptions.$language' => 1,
			'descriptions.$language.plain' => 1,
			'title' => 1,
			'title.plain' => 1,
			'category' => 1,
			'category.plain' => 1,
			'heading' => 1,
			'heading.plain' => 1,
			'auxiliary_text' => 1,
			'auxiliary_text.plain' => 1,
			'file_text' => 1,
			'file_text.plain' => 1,
			'redirect.title' => 1,
			'redirect.title.plain' => 1,
			'text' => 1,
			'text.plain' => 1,
			'suggest' => 1,
		],
		'decay' => [
			'descriptions.$language' => 0.9,
			'descriptions.$language.plain' => 0.9,
			// below is not actually a field
			'synonyms' => 0.5,
		],
		'entitiesVariableBoost' => true,
		'normalizeMultiClauseScores' => false,
		'applyLogisticFunction' => false,
		'useSynonyms' => false,
		'logisticRegressionIntercept' => 0,
		'entitySearchBaseUri' => $config->get( 'MediaInfoExternalEntitySearchBaseUri' ),
		'titleMatchBaseUri' => $config->get( 'MediaInfoMediaSearchTitleMatchBaseUri' ),
		'synonymsMaxAmount' => 5,
		'synonymsMinScoreThreshold' => 0.5,
		'synonymsMinByteLength' => 2,
		'synonymsMinSimilarityToCanonicalForm' => 0.75,
		'synonymsMinDifferenceFromOthers' => 0.25,
		'weightedTagsMinScoreThreshold' => 0.5,
		'nearMatchBoost' => 3.0,
	];
	$settings = array_replace_recursive( $defaultSettings, $settings );

	// work around '.' being replaced by '_' in query keys
	$fixUnderscores = static function ( $underscored, $original ) use ( &$fixUnderscores ) {
		$result = [];
		foreach ( $underscored as $key => $value ) {
			// build a regex where all underscores match either dot or underscore; rest has to be
			// an exact match
			$regex = '/^' . str_replace( '_', '[\._]', preg_quote( $key, '/' ) ) . '$/';
			// then find a match in the expected keys
			$matches = preg_grep( $regex, array_keys( $original ) );
			if ( $matches ) {
				$key = array_pop( $matches );
			}
			$result[ $key ] = is_array( $value ) ? $fixUnderscores( $value, $original[ $key ] ?? [] ) : $value;
		}
		return $result;
	};

	// allow settings (boost etc.) to be customized from URL query params
	foreach ( RequestContext::getMain()->getRequest()->getQueryValues() as $key => $value ) {
		// convert [ 'one:two' => 'three' ] into ['one']['two'] = 'three'
		$flat = array_merge( explode( ':', urldecode( $key ) ), [ floatval( $value ) ] );
		$result = array_reduce(
			array_reverse( $flat ),
			static function ( $previous, $key ) {
				return $previous !== null ? [ $key => $previous ] : $key;
			},
			null
		);

		$settings = array_replace_recursive( $settings, $fixUnderscores( $result, $settings ) );
	}

	return [
		'builder_factory' => closureToAnonymousClass( static function ( array $settings ) {
			$languageCode = RequestContext::getMain()->getLanguage()->getCode();
			$languageFallbackChain = WikibaseRepo::getLanguageFallbackChainFactory()
				->newFromLanguageCode( $languageCode );

			$mwServices = MediaWikiServices::getInstance();
			$config = $mwServices->getMainConfig();
			$configFactory = $mwServices->getConfigFactory();
			$searchConfig = $configFactory->makeConfig( 'CirrusSearch' );
			if ( !$searchConfig instanceof SearchConfig ) {
				throw new UnexpectedValueException( 'CirrusSearch config must be instanceof SearchConfig' );
			}
			$features = ( new FullTextKeywordRegistry( $searchConfig ) )->getKeywords();

			$languages = array_merge( [ $languageCode ], $languageFallbackChain->getFetchLanguageCodes() );
			$languages = array_unique( $languages );
			$entitySearchBaseUri = sprintf( $settings[ 'entitySearchBaseUri' ], $languageCode );
			$titleMatchBaseUri = sprintf( $settings[ 'titleMatchBaseUri' ], $languageCode );

			$entitiesFetcher = new MediaSearchMemoryEntitiesFetcher(
				new MediaSearchCachingEntitiesFetcher(
					new MediaSearchEntitiesFetcher(
						$mwServices->getHttpRequestFactory()->createMultiClient(),
						$entitySearchBaseUri,
						$titleMatchBaseUri,
						$languageCode,
						$config->get( 'LanguageCode' )
					),
					$mwServices->getMainWANObjectCache(),
					$languageCode,
					$config->get( 'LanguageCode' ),
					$entitySearchBaseUri . '-' . $titleMatchBaseUri
				)
			);

			return new MediaSearchQueryBuilder(
				$features,
				new MediaSearchASTQueryBuilder(
					new MediaSearchASTEntitiesExtractor( $entitiesFetcher ),
					$configFactory->makeConfig( 'WikibaseCirrusSearch' )->get( 'UseStemming' ),
					$languages,
					$config->get( 'LanguageCode' ),
					$settings
				)
			);
		} ),
		'settings' => $settings,
	];
}, $profiles );
