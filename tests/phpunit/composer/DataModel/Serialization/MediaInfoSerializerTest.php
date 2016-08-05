<?php

namespace Wikibase\MediaInfo\Tests\DataModel\Serialization;

use PHPUnit_Framework_TestCase;
use Serializers\Exceptions\SerializationException;
use Serializers\Serializer;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;

/**
 * @covers Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoSerializerTest extends PHPUnit_Framework_TestCase {

	private function newSerializer() {
		$termListSerializer = $this->getMock( Serializer::class );
		$termListSerializer->expects( $this->any() )
			->method( 'serialize' )
			->will( $this->returnCallback( function( TermList $terms ) {
				return $terms->toTextArray();
			} ) );

		$statementListSerializer = $this->getMock( Serializer::class );
		$statementListSerializer->expects( $this->any() )
			->method( 'serialize' )
			->will( $this->returnCallback( function( StatementList $statementList ) {
				return implode( '|', $statementList->getPropertyIds() );
			} ) );

		return new MediaInfoSerializer( $termListSerializer, $statementListSerializer );
	}

	public function provideObjectSerializations() {
		$serializations = [];

		$mediaInfo = new MediaInfo();

		$serializations['empty'] = [
			$mediaInfo,
			[
				'type' => 'mediainfo',
				'labels' => [],
				'descriptions' => [],
				'statements' => '',
			]
		];

		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );

		$serializations['with id'] = [
			$mediaInfo,
			[
				'type' => 'mediainfo',
				'id' => 'M1',
				'labels' => [],
				'descriptions' => [],
				'statements' => '',
			]
		];

		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$serializations['with content'] = [
			$mediaInfo,
			[
				'type' => 'mediainfo',
				'labels' => [ 'en' => 'Foo' ],
				'descriptions' => [ 'en' => 'Foo' ],
				'statements' => 'P42',
			]
		];

		$mediaInfo = new MediaInfo( new MediaInfoId( 'm2' ) );
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$serializations['with content and id'] = [
			$mediaInfo,
			[
				'type' => 'mediainfo',
				'id' => 'M2',
				'labels' => [ 'en' => 'Foo' ],
				'descriptions' => [ 'en' => 'Foo' ],
				'statements' => 'P42',
			]
		];

		return $serializations;
	}

	/**
	 * @dataProvider provideObjectSerializations
	 */
	public function testSerialize( $object, $serialization ) {
		$serializer = $this->newSerializer();

		$this->assertSame( $serialization, $serializer->serialize( $object ) );
	}

	public function testSerializationOrder() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );
		$serialization = $this->newSerializer()->serialize( $mediaInfo );

		$this->assertSame(
			[ 'type', 'id', 'labels', 'descriptions', 'statements' ],
			array_keys( $serialization )
		);
	}

	/**
	 * @dataProvider provideObjectSerializations
	 */
	public function testIsSerializerFor( $object ) {
		$serializer = $this->newSerializer();

		$this->assertTrue( $serializer->isSerializerFor( $object ) );
	}

	public function provideInvalidObjects() {
		return [
			[ null ],
			[ '' ],
			[ [] ],
			[ new Item() ]
		];
	}

	/**
	 * @dataProvider provideInvalidObjects
	 */
	public function testSerializeException( $object ) {
		$serializer = $this->newSerializer();

		$this->setExpectedException( SerializationException::class );
		$serializer->serialize( $object );
	}

	/**
	 * @dataProvider provideInvalidObjects
	 */
	public function testIsNotSerializerFor( $object ) {
		$serializer = $this->newSerializer();

		$this->assertFalse( $serializer->isSerializerFor( $object ) );
	}

}
