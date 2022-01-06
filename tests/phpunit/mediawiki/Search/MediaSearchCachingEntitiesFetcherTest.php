<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use HashBagOStuff;
use WANObjectCache;
use Wikibase\MediaInfo\Search\MediaSearchCachingEntitiesFetcher;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaSearchCachingEntitiesFetcher
 */
class MediaSearchCachingEntitiesFetcherTest extends MediaSearchEntitiesFetcherTest {
	protected function createMediaSearchEntitiesFetcher(): MediaSearchEntitiesFetcher {
		return new MediaSearchCachingEntitiesFetcher(
			parent::createMediaSearchEntitiesFetcher(),
			new WANObjectCache( [ 'cache' => new HashBagOStuff() ] ),
			'en',
			'en',
			'wbmi-mediasearch-entities'
		);
	}
}
