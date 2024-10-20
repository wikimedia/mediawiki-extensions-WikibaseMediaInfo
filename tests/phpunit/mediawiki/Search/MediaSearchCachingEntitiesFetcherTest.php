<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use Wikibase\MediaInfo\Search\MediaSearchCachingEntitiesFetcher;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;
use Wikimedia\ObjectCache\HashBagOStuff;
use Wikimedia\ObjectCache\WANObjectCache;

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
			'*'
		);
	}
}
