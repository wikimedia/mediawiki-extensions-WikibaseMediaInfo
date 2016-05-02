<?php

namespace Wikibase\MediaInfo\Tests\DataModel;

use InvalidArgumentException;
use PHPUnit_Framework_TestCase;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Statement\Statement;
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

		$this->assertSame( 'mediainfo', $mediaInfo->getType() );
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

	public function testSetNumericId() {
		$mediaInfo = new MediaInfo();
		// FIXME: Support for numeric IDs is a temporary hack that must be removed!
		$mediaInfo->setId( 1 );

		$this->assertSame( 'M1', $mediaInfo->getId()->getSerialization() );
	}

	public function provideInvalidIds() {
		return [
			[ null ],
			[ false ],
			// FIXME: Support for numeric IDs is a temporary hack that must be removed!
			// [ 1 ],
			[ 1.0 ],
			[ 'M1' ],
			[ new ItemId( 'Q1' ) ],
		];
	}

	/**
	 * @dataProvider provideInvalidIds
	 */
	public function testSetInvalidId( $id ) {
		$mediaInfo = new MediaInfo();

		$this->setExpectedException( InvalidArgumentException::class );
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

	public function provideEqualEntities() {
		$empty = new MediaInfo();

		$withLabel = new MediaInfo();
		$withLabel->getLabels()->setTextForLanguage( 'en', 'Foo' );

		$withDescription = new MediaInfo();
		$withDescription->getDescriptions()->setTextForLanguage( 'en', 'Foo' );

		$withStatement = new MediaInfo();
		$withStatement->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		return [
			'empty' => [
				$empty,
				new MediaInfo()
			],
			'same id' => [
				new MediaInfo( new MediaInfoId( 'M1' ) ),
				new MediaInfo( new MediaInfoId( 'M1' ) )
			],
			'different id' => [
				new MediaInfo( new MediaInfoId( 'M1' ) ),
				new MediaInfo( new MediaInfoId( 'M2' ) )
			],
			'no id' => [
				new MediaInfo( new MediaInfoId( 'M1' ) ),
				$empty
			],
			'same object' => [
				$empty,
				$empty
			],
			'same labels' => [
				$withLabel,
				clone $withLabel
			],
			'same descriptions' => [
				$withDescription,
				clone $withDescription
			],
			'same statements' => [
				$withStatement,
				clone $withStatement
			],
		];
	}

	/**
	 * @dataProvider provideEqualEntities
	 */
	public function testEquals( MediaInfo $a, MediaInfo $b ) {
		$this->assertTrue( $a->equals( $b ) );
	}

	public function provideNotEqualEntities() {
		$withLabel1 = new MediaInfo();
		$withLabel1->getLabels()->setTextForLanguage( 'en', 'Foo' );

		$withLabel2 = new MediaInfo();
		$withLabel2->getLabels()->setTextForLanguage( 'en', 'Bar' );

		$withDescription1 = new MediaInfo();
		$withDescription1->getDescriptions()->setTextForLanguage( 'en', 'Foo' );

		$withDescription2 = new MediaInfo();
		$withDescription2->getDescriptions()->setTextForLanguage( 'en', 'Bar' );

		$withStatement1 = new MediaInfo();
		$withStatement1->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );

		$withStatement2 = new MediaInfo();
		$withStatement2->getStatements()->addNewStatement( new PropertyNoValueSnak( 24 ) );

		return [
			'null' => [
				new MediaInfo(),
				null
			],
			'item' => [
				new MediaInfo(),
				new Item()
			],
			'different labels' => [
				$withLabel1,
				$withLabel2
			],
			'different descriptions' => [
				$withDescription1,
				$withDescription2
			],
			'different statements' => [
				$withStatement1,
				$withStatement2
			],
		];
	}

	/**
	 * @dataProvider provideNotEqualEntities
	 */
	public function testNotEquals( MediaInfo $a, $b ) {
		$this->assertFalse( $a->equals( $b ) );
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
		$copy->getStatements()->getFirstStatementWithGuid( null )->setRank(
			Statement::RANK_DEPRECATED
		);

		$this->assertSame( 'M1', $mediaInfo->getId()->getSerialization() );
		$this->assertSame( 'Foo', $mediaInfo->getLabels()->getByLanguage( 'en' )->getText() );
		$this->assertSame( 'Foo', $mediaInfo->getDescriptions()->getByLanguage( 'en' )->getText() );
		$this->assertCount( 1, $mediaInfo->getStatements() );
		$this->assertSame(
			Statement::RANK_NORMAL,
			$mediaInfo->getStatements()->getFirstStatementWithGuid( null )->getRank()
		);
	}

}
