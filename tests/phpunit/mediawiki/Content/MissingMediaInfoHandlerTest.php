<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use FauxRequest;
use Language;
use ParserOutput;
use RequestContext;
use Title;
use TitleFactory;
use Wikibase\DataModel\Entity\SerializableEntityId;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
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
 * @license GPL-2.0-or-later
 * @author Daniel Kinzler
 */
class MissingMediaInfoHandlerTest extends \PHPUnit\Framework\TestCase {

	/**
	 * @return TitleFactory
	 */
	private function getTitleFactory() {
		$titleFactory = $this->createMock( TitleFactory::class );

		$titleFactory->method( 'newFromID' )
			->will( $this->returnCallback( static function ( $pageId ) {
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
						return null;
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
		$entityIdComposer = new EntityIdComposer( [
			'mediainfo' => static function ( $repositoryName, $uniquePart ) {
				return new MediaInfoId( SerializableEntityId::joinSerialization( [
					$repositoryName,
					'',
					'M' . $uniquePart
				] ) );
			},
		] );
		$idLookup = new MediaInfoIdLookup( $entityIdComposer, NS_FILE );
		$filePageLookup = new FilePageLookup( $this->getTitleFactory() );

		$outputGenerator = $this->createMock( EntityParserOutputGenerator::class );

		$outputGenerator->method( 'getParserOutput' )
			->willReturn( new ParserOutput( $text ) );

		/** @var EntityParserOutputGeneratorFactory $outputGeneratorFactory */
		$outputGeneratorFactory = $this->createMock( EntityParserOutputGeneratorFactory::class );

		$outputGeneratorFactory->method( 'getEntityParserOutputGenerator' )
			->willReturn( $outputGenerator );

		$handler = new MissingMediaInfoHandler(
			$idLookup,
			$filePageLookup,
			$outputGeneratorFactory
		);

		return $handler;
	}

	public function provideGetMediaInfoId() {
		// NOTE: getTitleFactory() defines a file with page ID 1 exists (File:Test-1.png),
		// a non-file page with id 11 exists (User:Test-11.png), and no other pages exist.
		$titleFactory = $this->getTitleFactory();

		return [
			'media info page exists and is file page' => [
				$titleFactory->newFromID( 1 ),
				new MediaInfoId( 'M1' )
			],
			'media info page exists but is no file page' => [
				$titleFactory->newFromID( 11 ),
				null
			],
			'media info page/file page does not exist' => [
				Title::makeTitle( NS_FILE, 'Test-111.png' ),
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
		$title = Title::makeTitle( NS_FILE, 'Some_file.jpg' );
		$title->resetArticleID( 1 );
		$id = new MediaInfoId( 'M1' );
		$dummyText = '((MEDIAINFO VIEW))';

		$context = $this->getContext( $title );
		$handler = $this->newHandler( $title, $dummyText );

		$handler->showVirtualMediaInfo( $id, $context );

		$output = $context->getOutput();
		$html = $output->getHTML();

		$this->assertStringContainsString( $dummyText, $html );
	}

}
