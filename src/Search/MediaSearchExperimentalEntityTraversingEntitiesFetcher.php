<?php

namespace Wikibase\MediaInfo\Search;

use InvalidArgumentException;
use MediaWiki\Sparql\SparqlClient;
use RequestContext;
use Wikibase\DataModel\Entity\PropertyId;

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
class MediaSearchExperimentalEntityTraversingEntitiesFetcher extends MediaSearchEntitiesFetcher {
	/** @var MediaSearchEntitiesFetcher */
	protected $fetcher;

	/** @var SparqlClient */
	protected $sparqlClient;

	/** @var string */
	protected $language;

	/** @var array */
	protected $searchProperties;

	public function __construct(
		MediaSearchEntitiesFetcher $fetcher,
		SparqlClient $sparqlClient,
		string $language,
		array $searchProperties
	) {
		$this->fetcher = $fetcher;
		$this->sparqlClient = $sparqlClient;
		$this->language = $language;
		$this->searchProperties = $searchProperties;
	}

	public function get( array $searchQueries ): array {
		$request = RequestContext::getMain()->getRequest();

		$parentResults = $this->fetcher->get( $searchQueries );

		$byEntityId = [];
		foreach ( $parentResults as $searchQuery => $entities ) {
			foreach ( $entities as $data ) {
				$byEntityId[$data['entityId']][$searchQuery] = $data;
			}
		}

		// when we go find derivatives, we must make sure that the initial entities that
		// we start from are pretty damn decent & relevant already; it makes no sense to
		// traverse entities that were barely relevant to begin with...
		// (e.g. 'fish pond' for a search for 'fish')
		$relevantItemIds = array_filter( $byEntityId, function ( $match ) {
			return reset( $match )['score'] > 0.5;
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
			SERVICE wikibase:label { bd:serviceParam wikibase:language "' . $this->language . '" }
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

			$parentData = $byEntityId[$parentId];
			foreach ( $parentData as $searchQuery => $data ) {
				$childItemIds[$searchQuery][$itemId] = [
					'entityId' => $itemId,
					'score' => $data['score'],
				];
			}
		}
		if ( count( $childItemIds ) === 0 ) {
			return $parentResults;
		}

		if ( $request->getCheck( 'dumpExtraFiles' ) ) {
			// WCQS will not accept a massive list of entities, so we'll chunk it up...
			$batchSize = 250;
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
		$limit = round( 750 / count( $this->searchProperties ) / count( $searchQueries ) );
		foreach ( $childItemIds as $searchQuery => $data ) {
			uasort( $data, function ( $a, $b ) {
				return $b['score'] <=> $a['score'];
			} );
			$childItemIds[$searchQuery] = array_values( array_slice( $data, 0, $limit ) );
		}

		return array_merge_recursive( $parentResults, $childItemIds );
	}
}
