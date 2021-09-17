<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use DataValues\Geo\Values\GlobeCoordinateValue;
use DataValues\Geo\Values\LatLongValue;
use DataValues\StringValue;
use DataValues\TimeValue;
use InvalidArgumentException;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\NumericPropertyId;
use Wikibase\DataModel\Reference;
use Wikibase\DataModel\ReferenceList;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Snak\PropertySomeValueSnak;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\DataModel\Snak\SnakList;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\Repo\Content\EntityInstanceHolder;

/**
 * @covers Wikibase\MediaInfo\Content\MediaInfoContent
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoContentTest extends \PHPUnit\Framework\TestCase {

	public function testInvalidEntityType() {
		$this->expectException( InvalidArgumentException::class );
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
			[ new MediaInfo( new MediaInfoId( 'M1' ) ) ],
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

	public function testGetTextForFilters() {
		$entity = new MediaInfo(
			new MediaInfoId( 'M123' ),
			new TermList( [ new Term( 'en', 'label1' ), new Term( 'de', 'label2' ) ] ),
			new TermList( [
				/* MediaInfo entities will not have descriptions */
				] ),
			new StatementList(
				new Statement(
					new PropertyValueSnak(
						new NumericPropertyId( 'P6654' ), new StringValue( 'stringvalue' )
					),
					new SnakList(
						[
							new PropertyValueSnak(
								new NumericPropertyId( 'P6654' ),
								new GlobeCoordinateValue( new LatLongValue( 1, 2 ), 1 )
							),
							new PropertyValueSnak(
								new NumericPropertyId( 'P6654' ),
								new TimeValue(
									'+2015-11-11T00:00:00Z',
									0,
									0,
									0,
									TimeValue::PRECISION_DAY,
									TimeValue::CALENDAR_GREGORIAN
								)
							),
						]
					),
					new ReferenceList(
						[
							new Reference(
								[
									new PropertySomeValueSnak( new NumericPropertyId( 'P987' ) ),
									new PropertyNoValueSnak( new NumericPropertyId( 'P986' ) )
								]
							)
						]
					),
					'imaguid'
				)
			)
		);

		$content = new MediaInfoContent( new EntityInstanceHolder( $entity ) );
		$output = $content->getTextForFilters();

		$this->assertSame(
			trim( file_get_contents( __DIR__ . '/textForFilters.txt' ) ),
			$output
		);
	}

}
