<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;
use Wikibase\MediaInfo\Search\MediaSearchMemoryEntitiesFetcher;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaSearchMemoryEntitiesFetcher
 */
class MediaSearchMemoryEntitiesFetcherTest extends MediaSearchEntitiesFetcherTest {
	protected function createMediaSearchEntitiesFetcher(): MediaSearchEntitiesFetcher {
		return new MediaSearchMemoryEntitiesFetcher(
			parent::createMediaSearchEntitiesFetcher()
		);
	}
}
