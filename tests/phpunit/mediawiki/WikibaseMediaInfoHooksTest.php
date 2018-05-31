<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use CirrusSearch\Search\CirrusIndexField;
use Elastica\Document;
use Hooks;
use Language;
use MediaWiki\MediaWikiServices;
use ParserOutput;
use Title;
use Wikibase\Content\EntityInstanceHolder;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;
use Wikibase\Repo\Search\Elastic\Fields\TermIndexField;
use Wikibase\Repo\Store\EntityTitleStoreLookup;
use Wikibase\Repo\WikibaseRepo;

/**
 * @covers \Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends \MediaWikiTestCase {

	/**
	 * @var bool Set to true if a ContentHandler has been injected into $wgContentHandlers
	 */
	private $contentHandlerInjected = false;

	public function testOnWikibaseEntityNamespaces() {
		global $wgNamespaceContentModels;

		// The SetupAfterCache hook already ran.
		// We now just check that it did what it should.
		$config = MediaWikiServices::getInstance()->getMainConfig();
		$entityNamespace = $config->get( 'MediaInfoNamespace' );

		if ( $entityNamespace === false ) {
			$this->markTestSkipped( 'MediaInfoNamespace is set to false,' .
				' disabling automatic namespace registration.' );
		}

		$this->assertArrayHasKey( $entityNamespace, $wgNamespaceContentModels );
		$this->assertSame( 'wikibase-mediainfo', $wgNamespaceContentModels[$entityNamespace] );

		$namespaceLookup = WikibaseRepo::getDefaultInstance()->getEntityNamespaceLookup();
		$namespace = $namespaceLookup->getEntityNamespace( 'mediainfo' );

		$this->assertSame( $entityNamespace, $namespace );
	}

	public function testNamespaceRegistration() {
		$config = MediaWikiServices::getInstance()->getMainConfig();

		$language = Language::factory( 'en' );
		$namespaces = $language->getNamespaces();

		$mediaInfoNS = $config->get( 'MediaInfoNamespace' );
		$mediaInfoTalkNS = $config->get( 'MediaInfoNamespaceTalk' );

		$this->assertArrayHasKey( $mediaInfoNS, $namespaces, 'MediaInfo namespace' );
		$this->assertArrayHasKey( $mediaInfoTalkNS, $namespaces, 'MediaInfo talk namespace' );
	}

	public function provideWikibaseEntityTypesHooks() {
		return [
			[ 'WikibaseRepoEntityTypes' ],
			[ 'WikibaseClientEntityTypes' ],
		];
	}

	/**
	 * @dataProvider provideWikibaseEntityTypesHooks
	 */
	public function testOnWikibaseEntityTypes( $hook ) {
		$entityTypeDefinitions = [
			'item' => [ 'foo', 'bar' ]
		];

		Hooks::run( $hook, [ &$entityTypeDefinitions ] );

		$this->assertArrayHasKey( 'item', $entityTypeDefinitions );
		$this->assertSame( [ 'foo', 'bar' ], $entityTypeDefinitions['item'] );

		$this->assertArrayHasKey( 'mediainfo', $entityTypeDefinitions );
	}

	public function testOnImagePageAfterImageLinks() {
		$imgTitle = Title::makeTitle( NS_FILE, 'Foo.jpg' );
		$imgTitle->resetArticleID( 23 );

		$imgPage = $this->getMockBuilder( \ImagePage::class )
			->disableOriginalConstructor()
			->getMock();

		$imgPage->expects( $this->any() )
			->method( 'getTitle' )
			->will( $this->returnValue( $imgTitle ) );

		$html = '';
		Hooks::run( 'ImagePageAfterImageLinks', [ $imgPage, &$html ] );

		$this->assertRegExp( '@<h2><a .*MediaInfo:M23.*>MediaInfo:M23</a></h2>@', $html );
	}

	public function testOnContentAlterParserOutput() {
		$content = new \WikitextContent( '' );
		$title = Title::newFromText( 'File.jpg', NS_FILE );
		$title->resetArticleID( 1 );
		$parserOutput = new ParserOutput();

		$this->assertArrayNotHasKey( 'mediainfo_entity', $parserOutput->getProperties() );

		Hooks::run( 'ContentAlterParserOutput', [ $content, $title, $parserOutput ] );

		$this->assertArrayHasKey( 'mediainfo_entity', $parserOutput->getProperties() );
		$this->assertEquals( 'M1', $parserOutput->getProperty( 'mediainfo_entity' ) );
	}

	public function testOnCirrusSearchBuildDocumentParseWithNonFilePage() {
		if ( !class_exists( 'CirrusSearch' ) ) {
			$this->markTestSkipped( 'CirrusSearch not installed, skipping' );
		}

		$args = $this->getArgsForCirrusSearchBuildDocumentParse();

		WikibaseMediaInfoHooks::onCirrusSearchBuildDocumentParse(
			$args['document'],
			Title::makeTitle( NS_MEDIA, 'TEST_TITLE' ),
			$args['contentObject'],
			$args['parserOutput'],
			$args['connection']
		);

		$this->assertEmpty( $args['document']->getData() );
		// verify version check not added
		$this->verifyDocumentMetadataAbsent(
			$args['document'],
			MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION
		);
	}

	public function testOnCirrusSearchBuildDocumentParseWithNonWikitextContent() {
		if ( !class_exists( 'CirrusSearch' ) ) {
			$this->markTestSkipped( 'CirrusSearch not installed, skipping' );
		}

		$args = $this->getArgsForCirrusSearchBuildDocumentParse();

		WikibaseMediaInfoHooks::onCirrusSearchBuildDocumentParse(
			$args['document'],
			$args['title'],
			new MediaInfoContent(
				new EntityInstanceHolder(
					new MediaInfo(
						new MediaInfoId( 'M999' )
					)
				)
			),
			$args['parserOutput'],
			$args['connection']
		);

		$this->assertEmpty( $args['document']->getData() );
		// verify version check not added
		$this->verifyDocumentMetadataAbsent(
			$args['document'],
			MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION
		);
	}

	private function getArgsForCirrusSearchBuildDocumentParse() {
		return [
			'document' => new Document(),
			'title' => Title::makeTitle( NS_FILE, 'TEST_TITLE' ),
			'contentObject' => new \WikitextContent( 'TEST_CONTENT' ),
			'parserOutput' => new ParserOutput( 'TEST_PARSER_OUTPUT' ),
			'connection' => $this->getMockBuilder( \CirrusSearch\Connection::class )
				->disableOriginalConstructor()
				->getMock()
		];
	}

	/**
	 * @dataProvider provideTestCSBDP
	 */
	public function testOnCirrusSearchBuildDocumentParseWithFileWhereMediaInfoItemDoesNotExist(
		$searchIndexData, $engineHints
	) {
		if ( !class_exists( 'CirrusSearch' ) ) {
			$this->markTestSkipped( 'CirrusSearch not installed, skipping' );
		}

		$args = $this->getArgsForCirrusSearchBuildDocumentParse();
		$this->injectMockContentHandler( $searchIndexData, $engineHints );

		$hookObject = new WikibaseMediaInfoHooks(
			$this->getMockEntityIdComposer(),
			$this->getMockEntityTitleStoreLookup( $this->getMockMediaInfoTitle( false ) )
		);

		$hookObject->doCirrusSearchBuildDocumentParse(
			$args['document'],
			$args['title'],
			$args['contentObject']
		);

		$this->assertEmpty( $args['document']->getData() );
		// verify version check not added
		$this->verifyDocumentMetadataAbsent(
			$args['document'],
			MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION
		);
	}

	/**
	 * @dataProvider provideTestCSBDP
	 */
	public function testOnCirrusSearchBuildDocumentParseWithFile( $searchIndexData, $engineHints ) {
		if ( !class_exists( 'CirrusSearch' ) ) {
			$this->markTestSkipped( 'CirrusSearch not installed, skipping' );
		}

		$args = $this->getArgsForCirrusSearchBuildDocumentParse();
		$this->injectMockContentHandler( $searchIndexData, $engineHints );

		$hookObject = new WikibaseMediaInfoHooks(
			$this->getMockEntityIdComposer(),
			$this->getMockEntityTitleStoreLookup( $this->getMockMediaInfoTitle( true ) )
		);

		$hookObject->doCirrusSearchBuildDocumentParse(
			$args['document'],
			$args['title'],
			$args['contentObject']
		);

		// Test data added to Document
		foreach ( $searchIndexData as $key => $value ) {
			$this->assertTrue( $args['document']->has( $key ) );
			$this->assertEquals( $value, $args['document']->get( $key ) );
		}

		// Test indexing hints added
		foreach ( $engineHints as $key => $value ) {
			if ( isset( $searchIndexData[$key] ) ) {
				$this->verifyDocumentMetadata(
					$args['document'],
					$key,
					$value[ CirrusIndexField::NOOP_HINT ]
				);
			} else {
				$this->verifyDocumentMetadataAbsent( $args['document'], $key );
			}
		}

		// Test version check added
		$this->verifyDocumentMetadata(
			$args['document'],
			MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION,
			'documentVersion'
		);
	}

	public function provideTestCSBDP() {
		if ( !class_exists( 'CirrusSearch' ) ) {
			return [];
		}

		return [
			'no data' => [
				'searchIndexData' => [],
				'engineHints' => [],
			],
			'index data, no hints' => [
				'searchIndexData' => [
					'field_1' => 'test data 1',
					'field_2' => 'test data 2',
				],
				'engineHints' => [],
			],
			'index data, some hints' => [
				'searchIndexData' => [
					'field_1' => 'test data 1',
					'field_2' => 'test data 2',
				],
				'engineHints' => [
					'field_1' => [ CirrusIndexField::NOOP_HINT => 'hint test 1' ]
				],
			],
			'index data, all hints' => [
				'searchIndexData' => [
					'field_1' => 'test data 1',
					'field_2' => 'test data 2',
				],
				'engineHints' => [
					'field_1' => [ CirrusIndexField::NOOP_HINT => 'hint test 1' ],
					'field_2' => [ CirrusIndexField::NOOP_HINT => 'hint test 2' ]
				],
			]
		];
	}

	/**
	 * Because the calls to add the indexing hints and the version check are static I can't mock
	 * them, so I'm testing the effect of the static call on the elastic Document object
	 *
	 * I realise that means I'm not testing the Hooks class in total isolation, but it's the best
	 * I can think of atm
	 *
	 */
	private function verifyDocumentMetadata( Document $document, $field, $handler ) {
		if ( !$document->hasParam( CirrusIndexField::DOC_HINT_PARAM ) ) {
			$this->fail( 'Missing metadata for field ' . $field );
			return;
		}
		$hints = $document->getParam( CirrusIndexField::DOC_HINT_PARAM );
		if ( !is_array( $hints ) ) {
			$this->fail( 'Missing metadata for field ' . $field );
			return;
		}
		if ( !is_array( $hints[CirrusIndexField::NOOP_HINT] ) ) {
			$this->fail( 'Missing metadata for field ' . $field );
			return;
		}
		$this->assertEquals(
			$handler,
			$hints[CirrusIndexField::NOOP_HINT][$field],
			'Missing metadata for field ' . $field
		);
	}

	private function verifyDocumentMetadataAbsent( Document $document, $field ) {
		if ( !$document->hasParam( CirrusIndexField::DOC_HINT_PARAM ) ) {
			return;
		}
		$hints = $document->getParam( CirrusIndexField::DOC_HINT_PARAM );
		if ( !is_array( $hints ) ) {
			return;
		}
		if ( !is_array( $hints[CirrusIndexField::NOOP_HINT] ) ) {
			return;
		}
		$this->assertFalse(
			isset( $hints[CirrusIndexField::NOOP_HINT][$field] ),
			'Found metadata for field ' . $field . ' when none expected'
		);
	}

	/**
	 * @return MediaInfoId
	 */
	private function getTestEntityId() {
		static $testEntityId;
		if ( !isset( $testEntityId ) ) {
			$testEntityId = new MediaInfoId( 'M999' );
		}
		return $testEntityId;
	}

	/**
	 * @return EntityIdComposer
	 */
	private function getMockEntityIdComposer() {
		$mockEntityIdComposer = $this->getMockBuilder( EntityIdComposer::class )
			->disableOriginalConstructor()
			->getMock();
		$mockEntityIdComposer->expects( $this->once() )
			->method( 'composeEntityId' )
			->with(
				$this->equalTo( '' ),
				$this->equalTo( MediaInfo::ENTITY_TYPE ),
				$this->isType( 'int' )
			)->willReturn( $this->getTestEntityId() );
		return $mockEntityIdComposer;
	}

	/**
	 * @param Title $getTitleForIdReturnValue
	 * @return EntityTitleStoreLookup
	 */
	private function getMockEntityTitleStoreLookup( $getTitleForIdReturnValue ) {
		$mockEntityTitleStoreLookup = $this->getMockBuilder( EntityTitleStoreLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$mockEntityTitleStoreLookup->expects( $this->once() )
			->method( 'getTitleForId' )
			->with( $this->getTestEntityId() )
			->willReturn( $getTitleForIdReturnValue );

		return $mockEntityTitleStoreLookup;
	}

	/**
	 * @param bool $existsReturnValue
	 * @return Title
	 */
	private function getMockMediaInfoTitle( $existsReturnValue ) {
		$mediaInfoTitle = $this->getMockBuilder( Title::class )
			->disableOriginalConstructor()
			->getMock();
		$mediaInfoTitle->expects( $this->once() )
			->method( 'exists' )
			->willReturn( $existsReturnValue );
		$mediaInfoTitle->method( 'getContentModel' )
			->willReturn( 'wikibase-mediainfo' );
		return $mediaInfoTitle;
	}

	/**
	 * @param array $searchIndexData
	 * @param array $engineHints
	 * @return MediaInfoHandler
	 */
	private function getMockContentHandler( $searchIndexData, $engineHints ) {
		$mockContentHandler = $this->getMockBuilder( MediaInfoHandler::class )
			->disableOriginalConstructor()
			->getMock();

		// Fields for search index, with engine hints
		$fieldsForSearchIndex = [];
		foreach ( $engineHints as $key => $value ) {
			$mockField = $this->getMockBuilder( TermIndexField::class )
				->disableOriginalConstructor()
				->getMock();
			$mockField->method( 'getEngineHints' )
				->willReturn( $value );
			$fieldsForSearchIndex[$key] = $mockField;
		}
		$mockContentHandler->expects( $this->once() )
			->method( 'getFieldsForSearchIndex' )
			->with( $this->isInstanceOf( \CirrusSearch::class ) )
			->willReturn( $fieldsForSearchIndex );

		// Data
		$mockContentHandler->expects( $this->once() )
			->method( 'getDataForFilePageSearchIndex' )
			->with( $this->isInstanceOf( \WikiPage::class ) )
			->willReturn( $searchIndexData );

		return $mockContentHandler;
	}

	/**
	 * @param array $searchIndexData
	 * @param array $engineHints
	 */
	private function injectMockContentHandler( $searchIndexData, $engineHints ) {
		global $wgContentHandlers;
		$mockContentHandler = function () use ( $searchIndexData, $engineHints ) {
			return $this->getMockContentHandler( $searchIndexData, $engineHints );
		};
		$this->setMwGlobals(
			[
				'wgContentHandlers' =>
					array_merge( $wgContentHandlers, [ 'wikibase-mediainfo' => $mockContentHandler ] )
			]
		);
		$this->contentHandlerInjected = true;
	}

	public function tearDown() {
		if ( $this->contentHandlerInjected ) {
			\ContentHandler::cleanupHandlersCache();
		}

		parent::tearDown();
	}

}
