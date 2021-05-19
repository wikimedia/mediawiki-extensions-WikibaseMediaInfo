<?php

namespace Wikibase\MediaInfo\Tests\DataModel\Serialization;

use Deserializers\Deserializer;
use Deserializers\Exceptions\DeserializationException;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;

/**
 * @covers Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoDeserializerTest extends \PHPUnit\Framework\TestCase {

	private function newDeserializer() {
		$idDeserializer = $this->createMock( Deserializer::class );
		$idDeserializer->method( 'deserialize' )
			->will( $this->returnCallback( static function ( $serialization ) {
				return new MediaInfoId( $serialization );
			} ) );

		$termListDeserializer = $this->createMock( Deserializer::class );
		$termListDeserializer->method( 'deserialize' )
			->will( $this->returnCallback( static function ( array $serialization ) {
				$termList = new TermList();

				foreach ( $serialization as $lang => $value ) {
					$termList->setTextForLanguage( $lang, $value );
				}

				return $termList;
			} ) );

		$statementListDeserializer = $this->createMock( Deserializer::class );
		$statementListDeserializer->method( 'deserialize' )
			->will( $this->returnCallback( static function ( array $serialization ) {
				$statementList = new StatementList();

				foreach ( $serialization as $propertyId ) {
					$statementList->addNewStatement( new PropertyNoValueSnak( $propertyId ) );
				}

				return $statementList;
			} ) );

		return new MediaInfoDeserializer(
			$idDeserializer,
			$termListDeserializer,
			$statementListDeserializer
		);
	}

	public function provideObjectSerializations() {
		$serializations = [];

		$serializations['empty'] = [
			[ 'type' => 'mediainfo' ],
			new MediaInfo()
		];

		$serializations['empty lists'] = [
			[
				'type' => 'mediainfo',
				'labels' => [],
				'descriptions' => [],
				'statements' => []
			],
			new MediaInfo()
		];

		$serializations['with id'] = [
			[
				'type' => 'mediainfo',
				'id' => 'M1'
			],
			new MediaInfo( new MediaInfoId( 'M1' ) )
		];

		$serializations['with id and empty lists'] = [
			[
				'type' => 'mediainfo',
				'id' => 'M1',
				'labels' => [],
				'descriptions' => [],
				'statements' => []
			],
			new MediaInfo( new MediaInfoId( 'M1' ) )
		];

		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$serializations['with content'] = [
			[
				'type' => 'mediainfo',
				'labels' => [ 'en' => 'Foo' ],
				'descriptions' => [ 'en' => 'Foo' ],
				'statements' => [ 42 ]
			],
			$mediaInfo
		];

		$mediaInfo = new MediaInfo( new MediaInfoId( 'm2' ) );
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$serializations['with content and id'] = [
			[
				'type' => 'mediainfo',
				'id' => 'M2',
				'labels' => [ 'en' => 'Foo' ],
				'descriptions' => [ 'en' => 'Foo' ],
				'statements' => [ 42 ]
			],
			$mediaInfo
		];

		return $serializations;
	}

	/**
	 * @dataProvider provideObjectSerializations
	 */
	public function testDeserialize( $serialization, $object ) {
		$deserializer = $this->newDeserializer();

		$this->assertEquals( $object, $deserializer->deserialize( $serialization ) );
	}

	/**
	 * @dataProvider provideObjectSerializations
	 */
	public function testIsDeserializerFor( $serialization ) {
		$deserializer = $this->newDeserializer();

		$this->assertTrue( $deserializer->isDeserializerFor( $serialization ) );
	}

	public function provideInvalidSerializations() {
		return [
			[ null ],
			[ '' ],
			[ [] ],
			[ [ 'foo' => 'bar' ] ],
			[ [ 'type' => null ] ],
			[ [ 'type' => 'item' ] ]
		];
	}

	/**
	 * @dataProvider provideInvalidSerializations
	 */
	public function testDeserializeException( $serialization ) {
		$deserializer = $this->newDeserializer();

		$this->expectException( DeserializationException::class );
		$deserializer->deserialize( $serialization );
	}

	/**
	 * @dataProvider provideInvalidSerializations
	 */
	public function testIsNotDeserializerFor( $serialization ) {
		$deserializer = $this->newDeserializer();

		$this->assertFalse( $deserializer->isDeserializerFor( $serialization ) );
	}

}
