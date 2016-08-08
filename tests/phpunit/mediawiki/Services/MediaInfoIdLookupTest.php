<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Services;

use MediaWiki\Linker\LinkTarget;
use TitleValue;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;

/**
 * @covers Wikibase\MediaInfo\IdLookup\MediaInfoIdLookup
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author Daniel Kinzler
 */
class MediaInfoIdLookupTest extends \PHPUnit_Framework_TestCase {

	public function provideGetIdFromLinkTarget() {
		return [
			[ new TitleValue( 112, 'M13' ), 'M13' ],
		];
	}

	/**
	 * @dataProvider provideGetIdFromLinkTarget
	 */
	public function testGetIdFromLinkTarget( LinkTarget $title, $expected ) {
		$lookup = new MediaInfoIdLookup( 112 );

		$id = $lookup->getIdFromLinkTarget( $title );

		$this->assertInstanceOf( MediaInfoId::class, $id );
		$this->assertEquals( $expected, $id->getSerialization() );
	}

	public function provideGetIdFromLinkTarget_fail() {
		return [
			'bad namespace' => [ new TitleValue( 123, 'M13' ) ],
			'malformed id' => [ new TitleValue( 112, 'MXX' ) ],
		];
	}

	/**
	 * @dataProvider provideGetIdFromLinkTarget_fail
	 */
	public function testGetIdFromLinkTarget_fail( LinkTarget $title ) {
		$lookup = new MediaInfoIdLookup( 112 );

		$id = $lookup->getIdFromLinkTarget( $title );

		$this->assertNull( $id );
	}

}
