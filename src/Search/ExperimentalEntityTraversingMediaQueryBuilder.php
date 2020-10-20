<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\SearchConfig;
use InvalidArgumentException;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Sparql\SparqlClient;
use RequestContext;
use WANObjectCache;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\Lib\LanguageFallbackChainFactory;
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

	/** @var SparqlClient */
	protected $sparqlClient;

	public function __construct(
		SearchConfig $config,
		array $features,
		array $settings,
		array $stemmingSettings,
		string $userLanguage,
		HttpRequestFactory $httpRequestFactory,
		WANObjectCache $objectCache,
		array $searchProperties,
		string $externalEntitySearchBaseUri,
		LanguageFallbackChainFactory $languageFallbackChainFactory,
		SparqlClient $sparqlClient
	) {
		parent::__construct(
			$config,
			$features,
			$settings,
			$stemmingSettings,
			$userLanguage,
			$httpRequestFactory,
			$objectCache,
			$searchProperties,
			$externalEntitySearchBaseUri,
			$languageFallbackChainFactory
		);
		$this->sparqlClient = $sparqlClient;
	}

	public static function newFromGlobals( array $settings ) {
		global $wgMediaInfoProperties,
			$wgMediaInfoExternalEntitySearchBaseUri,
			$wgMediaInfoMediaSearchEntitiesSparqlEndpointUri;
		$repo = WikibaseRepo::getDefaultInstance();
		$configFactory = MediaWikiServices::getInstance()->getConfigFactory();
		$httpRequestFactory = MediaWikiServices::getInstance()->getHttpRequestFactory();
		$stemmingSettings = $configFactory->makeConfig( 'WikibaseCirrusSearch' )->get( 'UseStemming' );
		$searchConfig = $configFactory->makeConfig( 'CirrusSearch' );
		if ( !$searchConfig instanceof SearchConfig ) {
			throw new \MWException( 'CirrusSearch config must be instanceof SearchConfig' );
		}
		$features = ( new FullTextKeywordRegistry( $searchConfig ) )->getKeywords();

		$sparqlClient = new SparqlClient( $wgMediaInfoMediaSearchEntitiesSparqlEndpointUri, $httpRequestFactory );
		$sparqlClient->setTimeout( 5 * 60 );
		$sparqlClient->setClientOptions( [ 'userAgent' => 'WikibaseMediaInfo media search tree traversal' ] );

		return new static(
			$searchConfig,
			$features,
			$settings,
			$stemmingSettings,
			$repo->getUserLanguage()->getCode(),
			$httpRequestFactory,
			MediaWikiServices::getInstance()->getMainWANObjectCache(),
			array_values( $wgMediaInfoProperties ),
			$wgMediaInfoExternalEntitySearchBaseUri,
			$repo->getLanguageFallbackChainFactory(),
			$sparqlClient
		);
	}

	protected function getMatchingWikibaseItems( string $term ): array {
		if ( !isset( $this->entitiesForTerm[$term] ) ) {
			$this->entitiesForTerm[$term] = $this->fetchMatchingWikibaseData( $term );
		}

		return $this->entitiesForTerm[$term];
	}

	protected function fetchMatchingWikibaseData( string $term ): array {
		$request = RequestContext::getMain()->getRequest();

		$data = parent::fetchMatchingWikibaseData( $term );
		$itemIds = array_combine(
			array_column( $data, 'entityId' ),
			$data
		);

		// when we go find derivatives, we must make sure that the initial entities that
		// we start from are pretty damn decent & relevant already; it makes no sense to
		// traverse entities that were barely relevant to begin with...
		// (e.g. 'fish pond' for a search for 'fish')
		$relevantItemIds = array_filter( $itemIds, function ( $match ) {
			return $match['score'] > 0.5;
		} );

		// of course this should really be configured elsewhere, but this will allow us
		// to try out things...
		$traversalProperties = array_filter(
			$request->getArray( 'traversalProperties', [ 'P31', 'P171', 'P180', 'P279' ] ),
			function ( $propertyId ) {
				try {
					// make sure to throw out invalid property serializations
					// @phan-suppress-next-line PhanNoopNew
					new PropertyId( $propertyId );
					return true;
				} catch ( InvalidArgumentException $e ) {
					return false;
				}
			}
		);

		// find child entities that actually have an image that matches
		$query = 'SELECT DISTINCT ?parent ?item ?itemLabel {
			VALUES ?parent { wd:' . implode( ' wd:', array_keys( $relevantItemIds ) ) . ' } .
			?item (wdt:' . implode( '|wdt:', $traversalProperties ) . ')+ ?parent
			SERVICE wikibase:label { bd:serviceParam wikibase:language "' . $this->userLanguage . '" }
		}';

		if ( $request->getCheck( 'dumpQuery' ) ) {
			exit( '<pre>' . htmlentities( $query ) . '</pre>' );
		}

		$entities = $this->sparqlClient->query( $query );
		if ( $request->getCheck( 'dumpEntities' ) ) {
			echo '<ul>';
			foreach ( $entities as $result ) {
				echo '<li><a href="' . $result['item'] . '">' . $result['itemLabel'] . '</a></li>';
			}
			echo '</ul>';
			exit;
		}

		$childItemIds = [];
		foreach ( $entities as $result ) {
			$parentId = preg_replace( '/^.*(Q\d+)$/', '$1', $result['parent'] );
			$itemId = preg_replace( '/^.*(Q\d+)$/', '$1', $result['item'] );
			$childItemIds[$itemId] = [
				'entityId' => $itemId,
				'score' => $itemIds[$parentId]['score'],
			];
		}
		if ( count( $childItemIds ) === 0 ) {
			return $data;
		}

		if ( $request->getCheck( 'dumpExtraFiles' ) ) {
			// WCQS will not accept a massive list of entities, so we'll chunk it up...
			$batchSize = 400;
			$count = count( $childItemIds );
			for ( $i = 0; $i * $batchSize < $count; $i++ ) {
				$batch = array_slice( array_keys( $childItemIds ), $i * $batchSize, $batchSize );
				$query = '#defaultView:ImageGrid
					SELECT ?image {
						VALUES ?item { wd:' . implode( ' wd:', $batch ) . ' } .
						?file (wdt:' . implode( '|wdt:', array_keys( $this->searchProperties ) ) . ') ?item .
						?file schema:contentUrl ?url .
						BIND(IRI(CONCAT(
							"http://commons.wikimedia.org/wiki/Special:FilePath/",
							REPLACE(SUBSTR(STR(?url),53),"_","%20")
						)) AS ?image)
					}';
				// @phan-suppress-next-line SecurityCheck-XSS
				echo '<a href="https://wcqs-beta.wmflabs.org/#' . rawurlencode( $query ) . '">
					Run batch #' . ( $i + 1 ) . ' on WCQS
				</a>
				<br/>';
			}
			exit;
		}

		// many of the sub-entities will likely not be attached to any file, which is ok;
		// ES (in its current config) will only accept 1024 clauses, though, so we should
		// still try to narrow it down to only those that are attached to file - we could
		// do that via WQCS, but that requires logging into an account etc. so it's not
		// very convenient
		// we'll simply grab a significant chunk and deal with what we've got, this is
		// only a (very) experimental thing anyway, and the various dump* query params can
		// be used for more detail, if needed
		$limit = round( 750 / count( $this->searchProperties ) );
		uasort( $childItemIds, function ( $a, $b ) {
			return $b['score'] <=> $a['score'];
		} );
		$data = array_merge( $data, array_values( array_slice( $childItemIds, 0, $limit ) ) );

		return $data;
	}
}
