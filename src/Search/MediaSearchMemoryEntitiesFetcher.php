<?php

namespace Wikibase\MediaInfo\Search;

class MediaSearchMemoryEntitiesFetcher extends MediaSearchEntitiesFetcher {
	/** @var MediaSearchEntitiesFetcher */
	protected $fetcher;

	/** @var array */
	protected static $cache = [];

	public function __construct( MediaSearchEntitiesFetcher $fetcher ) {
		$this->fetcher = $fetcher;
	}

	/**
	 * This is a wrapper around fetch, where the actual data is fetched.
	 * This simply reads from/writes to 2 intermediate caching levels:
	 * - in a property to allow for repeated calls within the same execution thread
	 * - in a separate key-value store, for follow-up requests (e.g. loading next
	 *   batch of results for the same term)
	 *
	 * @param array $searchQueries
	 * @return array
	 */
	public function get( array $searchQueries ): array {
		$emptyData = array_fill_keys( $searchQueries, [] );

		// fetch from memory, in case it was already requested in this process
		$fromMemory = array_intersect_key( static::$cache, $emptyData );

		// fetch remaining queries from cache
		$queriesToFetch = array_keys( array_diff_key( $emptyData, $fromMemory ) );
		$results = $this->fetcher->get( $queriesToFetch );

		// store in memory
		static::$cache += $results;

		return $fromMemory + $results + $emptyData;
	}
}
