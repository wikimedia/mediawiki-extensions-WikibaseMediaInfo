<?php

namespace Wikibase\MediaInfo\Tests\DataModel;

use InvalidArgumentException;
use PHPUnit_Framework_TestCase;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * @covers Wikibase\MediaInfo\DataModel\MediaInfoId
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoIdTest extends PHPUnit_Framework_TestCase {

	public function provideValidIds() {
		return [
			[ 'm1' ],
			[ 'M2' ],
			[ 'm1238253457982347893264' ],
			[ 'M123456789123456789123456789' ],
		];
	}

	/**
	 * @dataProvider provideValidIds
	 */
	public function testValidIds( $serialization ) {
		$id = new MediaInfoId( $serialization );

		$this->assertEquals( strtoupper( $serialization ), $id->getSerialization() );
	}

	public function provideInvalidIds() {
		return [
			[ null ],
			[ false ],
			[ 0 ],
			[ 42 ],
			[ '' ],
			[ 'm' ],
			[ 'M' ],
			[ '42' ],
			[ 'm0' ],
			[ 'M0123' ],
			[ ' m123' ],
			[ 'M123 ' ],
			[ 'm 2' ],
			[ 'm34534;' ],
			[ 'M3.14159' ],
			[ '345m' ],
			[ '1M22' ],
		];
	}

	/**
	 * @dataProvider provideInvalidIds
	 * @expectedException InvalidArgumentException
	 */
	public function testInvalidIds( $serialization ) {
		new MediaInfoId( $serialization );
	}

	public function testGetEntityType() {
		$id = new MediaInfoId( 'M1' );

		$this->assertEquals( 'mediainfo', $id->getEntityType() );
	}

	public function testSerialize() {
		$id = new MediaInfoId( 'M1' );

		$this->assertEquals( 'M1', $id->serialize() );
	}

	/**
	 * @dataProvider serializationProvider
	 */
	public function testUnserialize( $serialization ) {
		$id = new MediaInfoId( 'M1' );
		$id->unserialize( $serialization );
		$this->assertSame( $serialization, $id->getSerialization() );
	}

	public function serializationProvider() {
		return [
			[ 'M2' ],

			// All these cases are kind of an injection vector and allow constructing invalid ids.
			[ 'string' ],
			[ '' ],
			[ 2 ],
			[ null ],
		];
	}

	/**
	 * @dataProvider provideValidIds
	 */
	public function testSerializationRoundtrip( $idString ) {
		$id = new MediaInfoId( $idString );

		$this->assertEquals( $id, unserialize( serialize( $id ) ) );
	}

}
