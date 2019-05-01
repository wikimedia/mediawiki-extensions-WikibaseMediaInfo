<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use CirrusSearch\Search\CirrusIndexField;
use Elastica\Document;
use Hooks;
use Language;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use ParserOutput;
use Title;
use User;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;
use Wikibase\Search\Elastic\Fields\TermIndexField;

/**
 * @covers \Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends \MediaWikiTestCase {

	public function testOnWikibaseRepoEntityNamespaces() {
		$entityNamespaces = [];
		WikibaseMediaInfoHooks::onWikibaseRepoEntityNamespaces( $entityNamespaces );
		$this->assertArrayHasKey( MediaInfo::ENTITY_TYPE, $entityNamespaces );
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
		$entityTypeDefinitions = [];
		Hooks::run( $hook, [ &$entityTypeDefinitions ] );
		$this->assertArrayHasKey( 'mediainfo', $entityTypeDefinitions );
	}

	public function providePostCacheTransformInput() {
		return [
			'no placeholder, no change' => [
				'original' => 'SOME_TEXT',
				'expected' => 'SOME_TEXT',
			],
			'placeholder replaced' => [
				'original' => 'STRING_1<mw:slotheader>STRING_2</mw:slotheader>STRING_3',
				'expected' => 'STRING_1<mediainfoslotheader />STRING_3',
			],
		];
	}

	/**
	 * @dataProvider providePostCacheTransformInput
	 */
	public function testOnParserOutputPostCacheTransform( $original, $expected ) {
		$parserOutput = $this->getMockBuilder( ParserOutput::class )
			->disableOriginalConstructor()
			->getMock();
		WikibaseMediaInfoHooks::onParserOutputPostCacheTransform(
			$parserOutput,
			$original,
			[]
		);
		$this->assertEquals( $expected, $original );
	}

	private function getMockOutputPage( Title $title ) {
		$revision = $this->getMockBuilder( RevisionRecord::class )
			->disableOriginalConstructor()
			->getMock();
		$revision->method( 'getId' )
			->willReturn( 999 );

		$wikiPage = $this->getMockBuilder( \WikiPage::class )
			->disableOriginalConstructor()
			->getMock();
		$wikiPage->method( 'getRevision' )
			->willReturn( $revision );

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->setMethods( [
				'getTitle',
				'getLanguage',
				'getUser',
				'getWikiPage',
				'getContext',
				'addJsConfigVars',
				'addModuleStyles',
				'addModules',
			] )
			->getMock();

		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getLanguage' )
			->willReturn( Language::factory( 'en' ) );
		$out->method( 'getUser' )
			->willReturn( new User() );
		$out->method( 'getWikiPage' )
			->willReturn( $wikiPage );

		// TODO: Test that this doesn't appear on action=history etc. contexts
		$out->method( 'getContext' )
			->willReturn( new \RequestContext() );
		return $out;
	}

	public function testOnBeforePageDisplay() {
		$imgTitle = Title::makeTitle( NS_FILE, 'Foo.jpg' );
		$imgTitle->resetArticleID( 23 );

		$skin = $this->getMockBuilder( \Skin::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockOutputPage( $imgTitle );
		$out->expects( $this->once() )
			->method( 'addJsConfigVars' )
			->will( $this->returnCallback(
				function( $keys ) {
					$this->assertArrayHasKey( 'wbCurrentRevision', $keys );
				}
			) );
		$out->expects( $this->once() )
			->method( 'addModuleStyles' );
		$out->expects( $this->once() )
			->method( 'addModules' );

		WikibaseMediaInfoHooks::onBeforePageDisplay( $out, $skin );
	}

	public function testOnBeforePageDisplayWithMissingTitle() {
		$imgTitle = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$imgTitle->method( 'exists' )
			->willReturn( false );

		$out = $this->getMockOutputPage( $imgTitle );
		$out->expects( $this->once() )
			->method( 'addJsConfigVars' )
			->will( $this->returnCallback(
				function( $keys ) {
					$this->assertArrayNotHasKey( 'wbCurrentRevision', $keys );
				}
			) );

		$skin = $this->getMockBuilder( \Skin::class )
			->disableOriginalConstructor()
			->getMock();

		WikibaseMediaInfoHooks::onBeforePageDisplay( $out, $skin );
	}

	private function createHookObjectWithMocks() {
		return new WikibaseMediaInfoHooks(
			$this->getMockBuilder( EntityIdComposer::class )
				->disableOriginalConstructor()
				->getMock()
		);
	}

	public function testOnGetEntityByLinkedTitleLookup() {
		$lookup = $this->getMockBuilder( EntityByLinkedTitleLookup::class )
			->disableOriginalConstructor()
			->getMock();
		WikibaseMediaInfoHooks::onGetEntityByLinkedTitleLookup( $lookup );
		$this->assertInstanceOf(
			MediaInfoByLinkedTitleLookup::class,
			$lookup
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

	public function testOnCirrusSearchBuildDocumentParse_NoRevision() {
		$page = $this->getMockBuilder( \WikiPage::class )
			->disableOriginalConstructor()
			->getMock();
		$page->method( 'getRevisionRecord' )
			->willReturn( null );

		$hookObject = $this->createHookObjectWithMocks();

		$document = $this->getMockBuilder( Document::class )
			->disableOriginalConstructor()
			->getMock();
		$document->expects( $this->never() )
			->method( 'set' );

		$hookObject->doCirrusSearchBuildDocumentParse(
			$document,
			$page,
			$this->getMockBuilder( MediaInfoHandler::class )
				->disableOriginalConstructor()
				->getMock()
		);
	}

	public function testOnCirrusSearchBuildDocumentParse_NoSlot() {
		$revisionRecord = $this->getMockBuilder( RevisionRecord::class )
			->disableOriginalConstructor()
			->getMock();
		$revisionRecord->method( 'hasSlot' )
			->willReturn( false );

		$page = $this->getMockBuilder( \WikiPage::class )
			->disableOriginalConstructor()
			->getMock();
		$page->method( 'getRevisionRecord' )
			->willReturn( $revisionRecord );

		$hookObject = $this->createHookObjectWithMocks();

		$document = $this->getMockBuilder( Document::class )
			->disableOriginalConstructor()
			->getMock();
		$document->expects( $this->never() )
			->method( 'set' );

		$hookObject->doCirrusSearchBuildDocumentParse(
			$document,
			$page,
			$this->getMockBuilder( MediaInfoHandler::class )
				->disableOriginalConstructor()
				->getMock()
		);
	}

	/**
	 * @dataProvider provideTestCSBDP
	 */
	public function testOnCirrusSearchBuildDocumentParse( $searchIndexData, $engineHints ) {
		$content = $this->getMockBuilder( MediaInfoContent::class )
			->disableOriginalConstructor()
			->getMock();

		$slot = $this->getMockBuilder( SlotRecord::class )
			->disableOriginalConstructor()
			->getMock();
		$slot->method( 'getModel' )
			->willReturn( MediaInfo::ENTITY_TYPE );
		$slot->method( 'getContent' )
			->willReturn( $content );

		$revisionRecord = $this->getMockBuilder( RevisionRecord::class )
			->disableOriginalConstructor()
			->getMock();
		$revisionRecord->method( 'hasSlot' )
			->willReturn( true );
		$revisionRecord->method( 'getSlot' )
			->willReturn( $slot );

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

		$mediaInfoHandler = $this->getMockBuilder( MediaInfoHandler::class )
			->disableOriginalConstructor()
			->getMock();
		$mediaInfoHandler->expects( $this->once() )
			->method( 'getSlotDataForSearchIndex' )
			->with( $content )
			->willReturn( $searchIndexData );
		$mediaInfoHandler->expects( $this->once() )
			->method( 'getFieldsForSearchIndex' )
			->with( $this->isInstanceOf( \CirrusSearch::class ) )
			->willReturn( $fieldsForSearchIndex );

		$page = $this->getMockBuilder( \WikiPage::class )
			->disableOriginalConstructor()
			->getMock();
		$page->method( 'getRevisionRecord' )
			->willReturn( $revisionRecord );
		$page->method( 'getContentHandler' )
			->willReturn( $mediaInfoHandler );

		$hookObject = $this->createHookObjectWithMocks();

		$testDocument = new Document();

		$hookObject->doCirrusSearchBuildDocumentParse(
			$testDocument,
			$page,
			$mediaInfoHandler
		);

		// Test data added to Document
		foreach ( $searchIndexData as $key => $value ) {
			$this->assertTrue( $testDocument->has( $key ) );
			$this->assertEquals( $value, $testDocument->get( $key ) );
		}

		// Test indexing hints added
		foreach ( $engineHints as $key => $value ) {
			if ( isset( $searchIndexData[$key] ) ) {
				$this->verifyDocumentMetadata(
					$testDocument,
					$key,
					$value[ CirrusIndexField::NOOP_HINT ]
				);
			} else {
				$this->verifyDocumentMetadataAbsent( $testDocument, $key );
			}
		}
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
			$this->fail( 'Missing metadata param for field ' . $field );
			return;
		}
		$hints = $document->getParam( CirrusIndexField::DOC_HINT_PARAM );
		if ( !is_array( $hints ) ) {
			$this->fail( 'Metadata value for field ' . $field . ' is not an array' );
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

	public function provideTestCSBDP() {
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

}
