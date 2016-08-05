<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Services;

use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\MediaInfo\Services\MediaInfoServices;

/**
 * @covers Wikibase\MediaInfo\Services\MediaInfoServices
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author Daniel Kinzler
 */
class MediaInfoServicesTest extends \PHPUnit_Framework_TestCase {

	public function testGetMediaInfoIdLookup() {
		$this->assertInstanceOf(
			MediaInfoIdLookup::class,
			MediaInfoServices::getMediaInfoIdLookup()
		);
	}

	public function testGetFilePageLookup() {
		$this->assertInstanceOf(
			FilePageLookup::class,
			MediaInfoServices::getFilePageLookup()
		);
	}

}
