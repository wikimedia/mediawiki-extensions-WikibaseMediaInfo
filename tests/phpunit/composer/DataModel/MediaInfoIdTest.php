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
			[ 'm2147483647' ],
			[ 'M2147483647' ],
		];
	}

	/**
	 * @dataProvider provideValidIds
	 */
	public function testValidIds( $serialization ) {
		$id = new MediaInfoId( $serialization );

		$this->assertSame( strtoupper( $serialization ), $id->getSerialization() );
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
			[ "M1\n" ],
			[ 'm 2' ],
			[ 'm34534;' ],
			[ 'M3.14159' ],
			[ '345m' ],
			[ '1M22' ],
			[ 'M2147483648' ],
			[ 'M99999999999' ],
		];
	}

	/**
	 * @dataProvider provideInvalidIds
	 */
	public function testInvalidIds( $serialization ) {
		$this->setExpectedException( InvalidArgumentException::class );
		new MediaInfoId( $serialization );
	}

	public function testGetEntityType() {
		$id = new MediaInfoId( 'M1' );

		$this->assertSame( 'mediainfo', $id->getEntityType() );
	}

	public function testSerialize() {
		$id = new MediaInfoId( 'M1' );

		$this->assertSame( 'M1', $id->serialize() );
	}

	/**
	 * @dataProvider provideIdSerializations
	 */
	public function testUnserialize( $idString ) {
		$id = new MediaInfoId( 'M1' );
		$id->unserialize( $idString );
		$this->assertSame( $idString, $id->getSerialization() );
	}

	public function provideIdSerializations() {
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

	public function testSerializationStability() {
		$this->assertSame(
			'C:40:"Wikibase\MediaInfo\DataModel\MediaInfoId":2:{M1}',
			serialize( new MediaInfoId( 'M1' ) )
		);
	}

}
