<?php

namespace Wikibase\MediaInfo\Tests\DataModel;

use InvalidArgumentException;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * @covers Wikibase\MediaInfo\DataModel\MediaInfoId;
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoIdTest extends \PHPUnit\Framework\TestCase {

	public function provideValidIds() {
		return [
			[ 'm1', 'M1' ],
			[ 'M2', 'M2' ],
			[ 'm2147483647', 'M2147483647' ],
			[ 'M2147483647', 'M2147483647' ],
			[ ':m17', 'M17' ],
			[ 'foo:m17', 'foo:M17' ],
		];
	}

	/**
	 * @dataProvider provideValidIds
	 */
	public function testValidIds( $serialization, $expected ) {
		$id = new MediaInfoId( $serialization );

		$this->assertSame( $expected, $id->getSerialization() );
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
		$this->expectException( InvalidArgumentException::class );
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
	public function testUnserialize( $serialization, $expected ) {
		$id = new MediaInfoId( 'M1' );
		$id->unserialize( $serialization );
		$this->assertSame( $expected, $id->getSerialization() );
	}

	public function provideIdSerializations() {
		return [
			[ 'M2', 'M2' ],

			// All these cases are kind of an injection vector and allow constructing invalid ids.
			[ 'string', 'string' ],
			[ '', '' ],
			[ 2, 2 ],
			[ null, '' ],
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
		// Object serialization has changed a bit throughout the years:
		// - in older PHP versions (PHP >= 5.1.0), objects would implement the Serializable
		//   interface, with `serialize` and `unserialize` methods operating on a string
		// - PHP 7.4 introduced the magic `__serialize` and `__unserialize` methods, which
		//   work with arrays
		// - PHP 8.1 started to deprecate the old Serializable interface methods (when the
		//   magic methods are not also implemented)
		// In short: old PHP versions will serialize to a string (via the Serializable
		// interface's methods), while newer (since 7.4) will serialize to an array (via the
		// magic methods.) Both formats are acceptable, what matters is that the roundtrip
		// (serialize + unserialize) works, which is tested in testSerializationRoundtrip,
		// and that we remain backward compatible (ability to unserialize and older
		// serialization format), which is tested in testUnserializationCompatibility.
		$this->assertContains(
			serialize( new MediaInfoId( 'M1' ) ),
			[
				// PHP <= 7.3, via Serializable interface
				// @see https://www.php.net/manual/en/class.serializable.php
				'C:40:"Wikibase\MediaInfo\DataModel\MediaInfoId":2:{M1}',
				// PHP >= 7.4, via magic methods
				// @see https://www.php.net/manual/en/language.oop5.magic.php#object.serialize
				'O:40:"Wikibase\MediaInfo\DataModel\MediaInfoId":1:{s:13:"serialization";s:2:"M1";}'
			]
		);
	}

	public function testUnserializationCompatibility() {
		// PHP has changed its (un)serialization implementations throughout the years,
		// but remains compatible with older serialization formats (as long as they
		// are still supported via implementing the Serializable interface)
		// See more thorough description above about those changes in serialization format
		$this->assertEquals(
			new MediaInfoId( 'M1' ),
			unserialize( 'C:40:"Wikibase\MediaInfo\DataModel\MediaInfoId":2:{M1}' )
		);
	}

}
