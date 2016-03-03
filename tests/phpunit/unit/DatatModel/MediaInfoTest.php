<?php

namespace Wikibase\MediaInfo\Tests\DataModel;

use InvalidArgumentException;
use PHPUnit_Framework_TestCase;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * @covers Wikibase\MediaInfo\DataModel\MediaInfo
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoTest extends PHPUnit_Framework_TestCase {

	public function testConstructor() {
		$id = new MediaInfoId( 'M1' );
		$labels = new TermList();
		$descriptions = new TermList();
		$statements = new StatementList();

		$mediaInfo = new MediaInfo( $id, $labels, $descriptions, $statements );

		$this->assertSame( $id, $mediaInfo->getId() );
		$this->assertSame( $labels, $mediaInfo->getLabels() );
		$this->assertSame( $descriptions, $mediaInfo->getDescriptions() );
		$this->assertSame( $statements, $mediaInfo->getStatements() );
	}

	public function testEmptyConstructor() {
		$mediaInfo = new MediaInfo();

		$this->assertNull( $mediaInfo->getId() );
		$this->assertEquals( new TermList(), $mediaInfo->getLabels() );
		$this->assertEquals( new TermList(), $mediaInfo->getDescriptions() );
		$this->assertEquals( new StatementList(), $mediaInfo->getStatements() );
	}

	public function testGetEntityType() {
		$mediaInfo = new MediaInfo();

		$this->assertEquals( 'mediainfo', $mediaInfo->getType() );
	}

	public function testSetNewId() {
		$mediaInfo = new MediaInfo();
		$id = new MediaInfoId( 'M1' );
		$mediaInfo->setId( $id );

		$this->assertSame( $id, $mediaInfo->getId() );
	}

	public function testOverrideId() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );
		$id = new MediaInfoId( 'M1' );
		$mediaInfo->setId( $id );

		$this->assertSame( $id, $mediaInfo->getId() );
	}

	public function provideInvalidIds() {
		return [
			[ null ],
			[ false ],
			[ 42 ],
			[ 'M1' ],
			[ new ItemId( 'Q1' ) ],
		];
	}

	/**
	 * @dataProvider provideInvalidIds
	 * @expectedException InvalidArgumentException
	 */
	public function testSetInvalidId( $id ) {
		$mediaInfo = new MediaInfo();
		$mediaInfo->setId( $id );
	}

	public function testIsEmpty() {
		$mediaInfo = new MediaInfo();

		$this->assertTrue( $mediaInfo->isEmpty() );
	}

	public function testIsEmptyWithId() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );

		$this->assertTrue( $mediaInfo->isEmpty() );
	}

	public function testIsNotEmptyWithLabel() {
		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );

		$this->assertFalse( $mediaInfo->isEmpty() );
	}

	public function testIsNotEmptyWithDescription() {
		$mediaInfo = new MediaInfo();
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );

		$this->assertFalse( $mediaInfo->isEmpty() );
	}

	public function testIsNotEmptyWithStatement() {
		$mediaInfo = new MediaInfo();
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$this->assertFalse( $mediaInfo->isEmpty() );
	}

	public function testEqualsEmpty() {
		$mediaInfo = new MediaInfo();

		$this->assertTrue( $mediaInfo->equals( new MediaInfo() ) );
	}

	public function testEqualsSameId() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );

		$this->assertTrue( $mediaInfo->equals( new MediaInfo( new MediaInfoId( 'M1' ) ) ) );
	}

	public function testEqualsDifferentId() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );

		$this->assertTrue( $mediaInfo->equals( new MediaInfo( new MediaInfoId( 'M2' ) ) ) );
	}

	public function testEqualsNoId() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );

		$this->assertTrue( $mediaInfo->equals( new MediaInfo() ) );
	}

	public function testEqualsSameObject() {
		$mediaInfo = new MediaInfo();

		$this->assertTrue( $mediaInfo->equals( $mediaInfo ) );
	}

	public function testEqualsSameLabels() {
		$mediaInfo1 = new MediaInfo();
		$mediaInfo2 = new MediaInfo();

		$mediaInfo1->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo2->getLabels()->setTextForLanguage( 'en', 'Foo' );

		$this->assertTrue( $mediaInfo1->equals( $mediaInfo2 ) );
	}

	public function testEqualsSameDescriptions() {
		$mediaInfo1 = new MediaInfo();
		$mediaInfo2 = new MediaInfo();

		$mediaInfo1->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo2->getDescriptions()->setTextForLanguage( 'en', 'Foo' );

		$this->assertTrue( $mediaInfo1->equals( $mediaInfo2 ) );
	}

	public function testEqualsSameStatements() {
		$mediaInfo1 = new MediaInfo();
		$mediaInfo2 = new MediaInfo();

		$mediaInfo1->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );
		$mediaInfo2->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$this->assertTrue( $mediaInfo1->equals( $mediaInfo2 ) );
	}

	public function testNotEqualsNull() {
		$mediaInfo = new MediaInfo();

		$this->assertFalse( $mediaInfo->equals( null ) );
	}

	public function testNotEqualsItem() {
		$mediaInfo = new MediaInfo();

		$this->assertFalse( $mediaInfo->equals( new Item() ) );
	}

	public function testNotEqualsDifferentLabels() {
		$mediaInfo1 = new MediaInfo();
		$mediaInfo2 = new MediaInfo();

		$mediaInfo1->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo2->getLabels()->setTextForLanguage( 'en', 'Bar' );

		$this->assertFalse( $mediaInfo1->equals( $mediaInfo2 ) );
	}

	public function testNotEqualsDifferentDescriptions() {
		$mediaInfo1 = new MediaInfo();
		$mediaInfo2 = new MediaInfo();

		$mediaInfo1->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo2->getDescriptions()->setTextForLanguage( 'en', 'Bar' );

		$this->assertFalse( $mediaInfo1->equals( $mediaInfo2 ) );
	}

	public function testNotEqualsDifferentStatements() {
		$mediaInfo1 = new MediaInfo();
		$mediaInfo2 = new MediaInfo();

		$mediaInfo1->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );
		$mediaInfo2->getStatements()->addNewStatement( new PropertyNoValueSnak( 24 ) );

		$this->assertFalse( $mediaInfo1->equals( $mediaInfo2 ) );
	}

	public function testCopyEmptyEquals() {
		$mediaInfo = new MediaInfo();

		$this->assertEquals( $mediaInfo, $mediaInfo->copy() );
	}

	public function testCopyWithIdEquals() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );

		$this->assertEquals( $mediaInfo, $mediaInfo->copy() );
	}

	public function testCopyWithContentEquals() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$this->assertEquals( $mediaInfo, $mediaInfo->copy() );
	}

	public function testCopyObjectReferences() {
		$id = new MediaInfoId( 'M1' );
		$labels = new TermList();
		$descriptions = new TermList();
		$statements = new StatementList();

		$mediaInfo = new MediaInfo( $id, $labels, $descriptions, $statements );
		$copy = $mediaInfo->copy();

		$this->assertSame( $id, $copy->getId() );
		$this->assertNotSame( $labels, $copy->getLabels() );
		$this->assertNotSame( $descriptions, $copy->getDescriptions() );
		$this->assertNotSame( $statements, $copy->getStatements() );
	}

	public function testCopyModification() {
		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$copy = $mediaInfo->copy();

		$copy->setId( new MediaInfoId( 'M2' ) );
		$copy->getLabels()->setTextForLanguage( 'en', 'Bar' );
		$copy->getDescriptions()->setTextForLanguage( 'en', 'Bar' );
		$copy->getStatements()->addNewStatement( new PropertyNoValueSnak( 24 ) );

		$this->assertEquals( 'M1', $mediaInfo->getId()->getSerialization() );
		$this->assertEquals( 'Foo', $mediaInfo->getLabels()->getByLanguage( 'en' )->getText() );
		$this->assertEquals( 'Foo', $mediaInfo->getDescriptions()->getByLanguage( 'en' )->getText() );
		$this->assertEquals( 1, $mediaInfo->getStatements()->count() );
	}

}
