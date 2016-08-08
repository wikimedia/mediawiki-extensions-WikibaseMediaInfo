<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use FauxRequest;
use Language;
use ParserOutput;
use RequestContext;
use Title;
use Wikibase\Client\Store\TitleFactory;
use Wikibase\Lib\Store\StorageException;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\Repo\ParserOutput\EntityParserOutputGenerator;
use Wikibase\Repo\ParserOutput\EntityParserOutputGeneratorFactory;

/**
 * @covers Wikibase\MediaInfo\Content\MissingMediaInfoHandler
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author DanielKinzler
 */
class MissingMediaInfoHandlerTest extends \PHPUnit_Framework_TestCase {

	/**
	 * @return TitleFactory
	 */
	private function getTitleFactory() {
		$titleFactory = $this->getMock( TitleFactory::class );

		$titleFactory->expects( $this->any() )
			->method( 'newFromID' )
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

	/**
	 * @param Title $title
	 * @return RequestContext
	 * @throws \MWException
	 */
	private function getContext( Title $title ) {
		$context = new RequestContext();
		$context->setRequest( new FauxRequest() );
		$context->setTitle( $title );
		$context->setLanguage( Language::factory( 'qqx' ) );

		return $context;
	}

	/**
	 * @param Title $title
	 * @param string $text
	 * @return MissingMediaInfoHandler
	 */
	private function newHandler( Title $title, $text = '' ) {
		$idLookup = new MediaInfoIdLookup( 112 );
		$filePageLookup = new FilePageLookup( $this->getTitleFactory() );

		$outputGenerator = $this->getMockBuilder( EntityParserOutputGenerator::class )
			->disableOriginalConstructor()
			->getMock();

		$outputGenerator->expects( $this->any() )
			->method( 'getParserOutput' )
			->will( $this->returnValue( new ParserOutput( $text ) ) );

		/** @var EntityParserOutputGeneratorFactory $outputGeneratorFactory */
		$outputGeneratorFactory = $this->getMockBuilder( EntityParserOutputGeneratorFactory::class )
			->disableOriginalConstructor()
			->getMock();

		$outputGeneratorFactory->expects( $this->any() )
			->method( 'getEntityParserOutputGenerator' )
			->will( $this->returnValue( $outputGenerator ) );

		$handler = new MissingMediaInfoHandler(
			$idLookup,
			$filePageLookup,
			$outputGeneratorFactory
		);

		return $handler;
	}

	public function provideGetMediaInfoId() {
		// NOTE: getTitleFactory() defines a file with page ID 1 exists (M1),
		// a non-file page with id 11 exists (M11), and no other pages exist.

		return [
			'media info page, file page exists' => [
				Title::makeTitle( 112, 'M1' ),
				new MediaInfoId( 'M1' )
			],
			'media info page, non-file page exists' => [
				Title::makeTitle( 112, 'M11' ),
				null
			],
			'media info page, file page does not exist' => [
				Title::makeTitle( 112, 'M111' ),
				null
			],
			'not a media info page' => [
				Title::makeTitle( 1, 'M1' ),
				null
			],
		];
	}

	/**
	 * @dataProvider provideGetMediaInfoId
	 *
	 * @param Title $title
	 * @param MediaInfoId|null $expected
	 */
	public function testGetMediaInfoId( Title $title, $expected ) {
		$context = $this->getContext( $title );
		$handler = $this->newHandler( $title );

		$id = $handler->getMediaInfoId( $title, $context );

		if ( $expected === null ) {
			$this->assertNull( $id );
		} else {
			$this->assertTrue( $expected->equals( $id ) );
		}
	}

	public function testShowVirtualMediaInfo() {
		$title = Title::makeTitle( 112, 'M1' );
		$id = new MediaInfoId( 'M1' );
		$dummyText = '((MEDIAINFO VIEW))';

		$context = $this->getContext( $title );
		$handler = $this->newHandler( $title, $dummyText );

		$handler->showVirtualMediaInfo( $id, $context );

		$output = $context->getOutput();
		$html = $output->getHTML();

		$this->assertContains( $dummyText, $html );
	}

}
