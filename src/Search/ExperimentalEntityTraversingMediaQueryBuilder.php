<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\SearchConfig;
use MediaWiki\MediaWikiServices;
use MediaWiki\Sparql\SparqlClient;
use Wikibase\Repo\WikibaseRepo;

/**
 * TODO FIXME EXPERIMENTAL
 * THIS CLASS IS MEANT TO GO AWAY SOON
 *
 * This is not meant to every be used publicly in its current implementation.
 * This is an experiment that should never run unless explicitly requested via
 * a URL parameter.
 * Because it connects to the Wikidata query service, this is not to be relied
 * on - this is only to be used for internal testing purposes, to figure out
 * what kind of additional data would be useful.
 * Once we have sufficient information around that, this will be removed.
 */
class ExperimentalEntityTraversingMediaQueryBuilder extends MediaQueryBuilder {

	public const SEARCH_PROFILE_CONTEXT_NAME = 'mediasearch_experimental';
	public const FULLTEXT_PROFILE_NAME = 'mediainfo_fulltext_experimental';

	public static function newFromGlobals( array $settings ) {
		global $wgMediaInfoProperties,
			$wgMediaInfoMediaSearchProperties,
			$wgMediaInfoExternalEntitySearchBaseUri,
			$wgMediaInfoMediaSearchEntitiesSparqlEndpointUri;

		$mwServices = MediaWikiServices::getInstance();
		$repo = WikibaseRepo::getDefaultInstance();
		$configFactory = $mwServices->getConfigFactory();
		$httpRequestFactory = $mwServices->getHttpRequestFactory();
		$stemmingSettings = $configFactory->makeConfig( 'WikibaseCirrusSearch' )->get( 'UseStemming' );
		$searchConfig = $configFactory->makeConfig( 'CirrusSearch' );
		if ( !$searchConfig instanceof SearchConfig ) {
			throw new \MWException( 'CirrusSearch config must be instanceof SearchConfig' );
		}
		$features = ( new FullTextKeywordRegistry( $searchConfig ) )->getKeywords();

		$sparqlClient = new SparqlClient( $wgMediaInfoMediaSearchEntitiesSparqlEndpointUri, $httpRequestFactory );
		$sparqlClient->setTimeout( 5 * 60 );
		$sparqlClient->setClientOptions( [ 'userAgent' => 'WikibaseMediaInfo media search tree traversal' ] );

		$userLanguage = $repo->getUserLanguage()->getCode();

		return new static(
			$searchConfig,
			$features,
			$settings,
			$stemmingSettings,
			$userLanguage,
			$wgMediaInfoMediaSearchProperties ?? array_fill_keys( array_values( $wgMediaInfoProperties ), 1 ),
			new MediaSearchMemoryEntitiesFetcher(
				new MediaSearchExperimentalEntityTraversingEntitiesFetcher(
					new MediaSearchEntitiesFetcher(
						$httpRequestFactory->createMultiClient(),
						$wgMediaInfoExternalEntitySearchBaseUri,
						$userLanguage
					),
					$sparqlClient,
					$userLanguage,
					$wgMediaInfoMediaSearchProperties ?? array_fill_keys( array_values( $wgMediaInfoProperties ), 1 )
				)
			),
			$repo->getLanguageFallbackChainFactory()
		);
	}

}
