<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use Hooks;
use Language;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use ParserOutput;
use Title;
use User;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\Lib\UserLanguageLookup;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;
use Wikibase\Repo\BabelUserLanguageLookup;
use Wikibase\Repo\Store\EntityTitleStoreLookup;

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
		$entityTypeDefinitions = [
			'item' => [ 'foo', 'bar' ]
		];

		Hooks::run( $hook, [ &$entityTypeDefinitions ] );

		$this->assertArrayHasKey( 'item', $entityTypeDefinitions );
		$this->assertSame( [ 'foo', 'bar' ], $entityTypeDefinitions['item'] );

		$this->assertArrayHasKey( 'mediainfo', $entityTypeDefinitions );
	}

	public function providePostCacheTransformInput() {
		return [
			'no placeholder' => [
				'original' => 'SOME_TEXT',
				'expected' => 'SOME_TEXT'
			],
			'placeholder' => [
				'original' => 'STRING_1<mw:slotheader>STRING_2</mw:slotheader>STRING_3',
				'expected' => 'STRING_1<mw:mediainfoslotheader />STRING_3',
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

	public function testOnBeforePageDisplay() {
		$imgTitle = Title::makeTitle( NS_FILE, 'Foo.jpg' );
		$imgTitle->resetArticleID( 23 );

		$userLanguageLookup = $this->getMockBuilder( UserLanguageLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$userLanguageLookup->method( 'getAllUserLanguages' )
			->willReturn( [ 'TEST_USER_LANGUAGE' ] );

		$skin = $this->getMockBuilder( \Skin::class )
			->disableOriginalConstructor()
			->getMock();

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
			->getMock();

		$out->method( 'getTitle' )
			->willReturn( $imgTitle );
		$out->method( 'getLanguage' )
			->willReturn( new Language() );
		$out->method( 'getUser' )
			->willReturn( new User() );
		$out->method( 'getWikiPage' )
			->willReturn( $wikiPage );

		$out->expects( $this->once() )
			->method( 'addJsConfigVars' );
		$out->expects( $this->once() )
			->method( 'addModuleStyles' );
		$out->expects( $this->once() )
			->method( 'addModules' );

		$hookObject = new WikibaseMediaInfoHooks(
			$this->getMockEntityIdComposer(),
			$this->getMockBuilder( EntityTitleStoreLookup::class )
				->disableOriginalConstructor()
				->getMock()
		);

		$hookObject->doBeforePageDisplay(
			$out,
			$skin,
			[],
			$userLanguageLookup
		);
	}

	public function testOnBeforePageDisplayWithMissingTitle() {
		$imgTitle = $this->getMockBuilder( \ImagePage::class )
			->disableOriginalConstructor()
			->getMock();
		$imgTitle->method( 'exists' )
			->willReturn( false );

		$skin = $this->getMockBuilder( \Skin::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $imgTitle );
		$out->expects( $this->never() )
			->method( 'addJsConfigVars' );

		$hookObject = new WikibaseMediaInfoHooks(
			$this->getMockBuilder( EntityIdComposer::class )
				->disableOriginalConstructor()
				->getMock(),
			$this->getMockBuilder( EntityTitleStoreLookup::class )
				->disableOriginalConstructor()
				->getMock()
		);

		$hookObject->doBeforePageDisplay(
			$out,
			$skin,
			[],
			new BabelUserLanguageLookup()
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

	public function testOnSearchDataForIndex() {
		$extraFieldsData = [
			'field_1' => 'field_1_data',
			'field_2' => 'field_2_data',
		];

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

		$page = $this->getMockBuilder( \WikiPage::class )
			->disableOriginalConstructor()
			->getMock();
		$page->method( 'getRevisionRecord' )
			->willReturn( $revisionRecord );

		$mediaInfoHandler = $this->getMockBuilder( MediaInfoHandler::class )
			->disableOriginalConstructor()
			->getMock();
		$mediaInfoHandler->expects( $this->atLeastOnce() )
			->method( 'getSlotDataForSearchIndex' )
			->with( $content )
			->willReturn( $extraFieldsData );

		$hookObject = new WikibaseMediaInfoHooks(
			$this->getMockBuilder( EntityIdComposer::class )
				->disableOriginalConstructor()
				->getMock(),
			$this->getMockBuilder( EntityTitleStoreLookup::class )
				->disableOriginalConstructor()
				->getMock()
		);
		$fieldsData = $hookObject->doSearchDataForIndex(
			$page,
			[ 'index' => 'value' ],
			$mediaInfoHandler
		);

		$this->assertArraySubset( $extraFieldsData, $fieldsData );
	}

	public function testOnSearchDataForIndexWithEmptySlot() {
		$originalFieldsData = [ 'index' => 'value' ];
		$extraFieldsData = [
			'field_1' => 'field_1_data',
			'field_2' => 'field_2_data',
		];

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

		$mediaInfoHandler = $this->getMockBuilder( MediaInfoHandler::class )
			->disableOriginalConstructor()
			->getMock();
		$mediaInfoHandler->expects( $this->never() )
			->method( 'getSlotDataForSearchIndex' )
			->willReturn( $extraFieldsData );

		$hookObject = new WikibaseMediaInfoHooks(
			$this->getMockBuilder( EntityIdComposer::class )
				->disableOriginalConstructor()
				->getMock(),
			$this->getMockBuilder( EntityTitleStoreLookup::class )
				->disableOriginalConstructor()
				->getMock()
		);
		$fieldsData = $hookObject->doSearchDataForIndex(
			$page,
			$originalFieldsData,
			$mediaInfoHandler
		);

		$this->assertEquals( $originalFieldsData, $fieldsData );
	}

	public function testOnSearchDataStatic() {
		$fieldsData = $originalFieldsData = [ 'index' => 'value' ];

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
			->willReturn( false );
		$revisionRecord->method( 'getSlot' )
			->willReturn( $slot );

		$page = $this->getMockBuilder( \WikiPage::class )
			->disableOriginalConstructor()
			->getMock();
		$page->method( 'getRevisionRecord' )
			->willReturn( $revisionRecord );

		WikibaseMediaInfoHooks::onSearchDataForIndex(
			$fieldsData,
			\ContentHandler::getForModelID( MediaInfoContent::CONTENT_MODEL_ID ),
			$page,
			new ParserOutput(),
			new \CirrusSearch()
		);

		$this->assertEquals( $originalFieldsData, $fieldsData );
	}

}
