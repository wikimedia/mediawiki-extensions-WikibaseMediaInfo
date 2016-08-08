<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Services;

use Title;
use Wikibase\Client\Store\TitleFactory;
use Wikibase\Lib\Store\StorageException;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;

/**
 * @covers Wikibase\MediaInfo\IdLookup\FilePageLookup
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author Daniel Kinzler
 */
class FilePageLookupTest extends \PHPUnit_Framework_TestCase {

	/**
	 * @return TitleFactory
	 */
	private function getTitleFactory() {
		$titleFactory = $this->getMock( TitleFactory::class );

		$titleFactory->expects( $this->any() )
			->method( 'newFromId' )
			->will( $this->returnCallback( function( $pageId ) {
				switch ( $pageId ) {
					case 1:
						$title = Title::makeTitle( NS_FILE, 'Test-' . $pageId . '.png' );
						$title->resetArticleID( $pageId );
						return $title;
					case 11:
						$title = Title::makeTitle( NS_USER, 'Test-' . $pageId . '.png' );
						$title->resetArticleID( $pageId );
						return $title;
					default:
						throw new StorageException( 'No such page id: ' . $pageId );
				}
			} ) );

		return $titleFactory;
	}

	public function provideGetFilePage() {
		return [
			[ new MediaInfoId( 'M1' ), 'Test-1.png' ],
		];
	}

	/**
	 * @dataProvider provideGetFilePage
	 */
	public function testGetFilePage( MediaInfoId $id, $expected ) {
		$lookup = new FilePageLookup( $this->getTitleFactory() );

		$title = $lookup->getFilePage( $id );

		$this->assertInstanceOf( Title::class, $title );
		$this->assertEquals( $expected, $title->getText() );
		$this->assertEquals( NS_FILE, $title->getNamespace() );
	}

	public function provideGetFilePage_fail() {
		return [
			'no such page' => [ new MediaInfoId( 'M17' ) ],
			'bad namespace' => [ new MediaInfoId( 'M2' ) ],
		];
	}

	/**
	 * @dataProvider provideGetFilePage_fail
	 */
	public function testGetFilePage_fail( MediaInfoId $id ) {
		$lookup = new FilePageLookup( $this->getTitleFactory() );

		$title = $lookup->getFilePage( $id );

		$this->assertNull( $title );
	}

}
