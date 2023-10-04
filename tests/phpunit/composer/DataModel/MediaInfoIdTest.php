<?php

namespace Wikibase\MediaInfo\Tests\DataModel;

use InvalidArgumentException;
use MediaWikiTestCaseTrait;
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

	use MediaWikiTestCaseTrait;

	public static function provideValidIds() {
		return [
			[ 'm1', 'M1' ],
			[ 'M2', 'M2' ],
			[ 'm2147483647', 'M2147483647' ],
			[ 'M2147483647', 'M2147483647' ],
		];
	}

	/**
	 * @dataProvider provideValidIds
	 */
	public function testValidIds( $serialization, $expected ) {
		$id = new MediaInfoId( $serialization );

		$this->assertSame( $expected, $id->getSerialization() );
	}

	public static function provideInvalidIds() {
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
			[ ':m123' ],
			[ 'foo:m17' ],
			[ 'foo:M17' ],
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

		$this->expectDeprecationAndContinue( '/MediaInfoId::serialize/' );
		$this->assertSame( 'M1', $id->serialize() );
	}

	/**
	 * @dataProvider provideIdSerializations
	 */
	public function testUnserialize( $serialization, $expected ) {
		$id = new MediaInfoId( 'M1' );
		$this->expectDeprecationAndContinue( '/MediaInfoId::unserialize/' );
		$id->unserialize( $serialization );
		$this->assertSame( $expected, $id->getSerialization() );
	}

	public static function provideIdSerializations() {
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

}
