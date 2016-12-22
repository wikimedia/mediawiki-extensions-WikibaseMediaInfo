<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use InvalidArgumentException;
use PHPUnit_Framework_TestCase;
use Wikibase\Content\EntityInstanceHolder;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * @covers Wikibase\MediaInfo\Content\MediaInfoContent
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoContentTest extends PHPUnit_Framework_TestCase {

	public function testInvalidEntityType() {
		$this->setExpectedException( InvalidArgumentException::class );
		new MediaInfoContent( new EntityInstanceHolder( new Item() ) );
	}

	public function testGetMediaInfo() {
		$mediaInfo = new MediaInfo();
		$mediaInfoContent = new MediaInfoContent( new EntityInstanceHolder( $mediaInfo ) );

		$this->assertSame( $mediaInfo, $mediaInfoContent->getMediaInfo() );
	}

	public function testGetEntity() {
		$mediaInfo = new MediaInfo();
		$mediaInfoContent = new MediaInfoContent( new EntityInstanceHolder( $mediaInfo ) );

		$this->assertSame( $mediaInfo, $mediaInfoContent->getEntity() );
	}

	public function testIsEmpty() {
		$mediaInfo = new MediaInfo();
		$content = new MediaInfoContent( new EntityInstanceHolder( $mediaInfo ) );

		$this->assertTrue( $content->isEmpty() );
	}

	public function testIsNotEmpty() {
		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$content = new MediaInfoContent( new EntityInstanceHolder( $mediaInfo ) );

		$this->assertFalse( $content->isEmpty() );
	}

	public function provideCountable() {
		$countable = [];

		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$countable[] = [ $mediaInfo ];

		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$countable[] = [ $mediaInfo ];

		$mediaInfo = new MediaInfo();
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$countable[] = [ $mediaInfo ];

		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );

		$mediaInfo = new MediaInfo();
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );
		$countable[] = [ $mediaInfo ];

		$mediaInfo = new MediaInfo( new MediaInfoId( 'M1' ) );
		$mediaInfo->getStatements()->addNewStatement( new PropertyNoValueSnak( 42 ) );
		$countable[] = [ $mediaInfo ];

		return $countable;
	}

	/**
	 * @dataProvider provideCountable
	 */
	public function testIsCountable( MediaInfo $mediaInfo ) {
		$mediaInfoContent = new MediaInfoContent( new EntityInstanceHolder( $mediaInfo ) );

		$this->assertTrue( $mediaInfoContent->isCountable() );
	}

	public function provideNotCountable() {
		return [
			[ new MediaInfo() ],
		    [ new MediaInfo( new MediaInfoId( 'M1' ) ) ]
		];
	}

	/**
	 * @dataProvider provideNotCountable
	 */
	public function testIsNotCountable( MediaInfo $mediaInfo ) {
		$mediaInfoContent = new MediaInfoContent( new EntityInstanceHolder( $mediaInfo ) );

		$this->assertFalse( $mediaInfoContent->isCountable() );
	}

	public function provideTextForSearchIndex() {
		$searchIndex = [
			[ new MediaInfo(), '' ]
		];

		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getLabels()->setTextForLanguage( 'de', 'Bar' );
		$searchIndex[] = [ $mediaInfo, "Foo\nBar" ];

		$mediaInfo = new MediaInfo();
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'de', 'Bar' );
		$searchIndex[] = [ $mediaInfo, "Foo\nBar" ];

		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'Foo' );
		$mediaInfo->getLabels()->setTextForLanguage( 'de', 'Bar' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'en', 'Foo desc' );
		$mediaInfo->getDescriptions()->setTextForLanguage( 'de', 'Bar desc' );
		$searchIndex[] = [ $mediaInfo, "Foo\nBar\nFoo desc\nBar desc" ];

		return $searchIndex;
	}

	/**
	 * @dataProvider provideTextForSearchIndex
	 */
	public function testGetTextForSearchIndex( MediaInfo $mediaInfo, $expected ) {
		$mediaInfoContent = new MediaInfoContent( new EntityInstanceHolder( $mediaInfo ) );

		$this->assertSame( $expected, $mediaInfoContent->getTextForSearchIndex() );
	}

}
