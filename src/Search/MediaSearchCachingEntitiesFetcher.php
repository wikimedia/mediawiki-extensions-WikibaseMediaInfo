<?php

namespace Wikibase\MediaInfo\Search;

use WANObjectCache;

class MediaSearchCachingEntitiesFetcher extends MediaSearchEntitiesFetcher {
	/** @var MediaSearchEntitiesFetcher */
	protected $fetcher;

	/** @var WANObjectCache */
	protected $objectCache;

	/** @var string */
	protected $inputLanguage;

	/** @var string */
	protected $outputLanguage;

	/** @var string */
	protected $keyPrefix;

	/** @var int */
	protected $ttl;

	public function __construct(
		MediaSearchEntitiesFetcher $fetcher,
		WANObjectCache $objectCache,
		string $inputLanguage,
		string $outputLanguage,
		string $keyPrefix = 'wbmi-mediasearch-entities',
		int $ttl = WANObjectCache::TTL_DAY
	) {
		$this->fetcher = $fetcher;
		$this->objectCache = $objectCache;
		$this->inputLanguage = $inputLanguage;
		$this->outputLanguage = $outputLanguage;
		$this->keyPrefix = $keyPrefix;
		$this->ttl = $ttl;
	}

	/**
	 * This is a wrapper around another MediaSearchEntitiesFetcher where the actual data is
	 * fetched.
	 * This simply reads from/writes to an intermediate cache in a separate key-value store, for
	 * follow-up requests (e.g. loading next batch of results for the same term)
	 *
	 * @param array $searchQueries
	 * @return array
	 */
	public function get( array $searchQueries ): array {
		if ( count( $searchQueries ) === 0 ) {
			return [];
		}

		$cacheKeys = $this->objectCache->makeMultiKeys(
			$searchQueries,
			function ( $query ) {
				return $this->objectCache->makeKey(
					$this->keyPrefix,
					$this->objectCache->hash256( $query ),
					$this->inputLanguage,
					$this->outputLanguage
				);
			}
		);

		// lookup in key/value store & fall back to actual fetch when it can't be found
		$cacheResult = $this->objectCache->getMultiWithUnionSetCallback(
			$cacheKeys,
			$this->ttl,
			function ( array $queries ) {
				return $this->fetcher->get( $queries );
			}
		);

		// $cacheResult is associative array with cache keys, but we want keys to be the
		// search queries; objectcache preserves key order, so a simple combine is safe
		return array_combine( $searchQueries, $cacheResult );
	}
}
