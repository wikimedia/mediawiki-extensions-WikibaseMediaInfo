<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use CirrusSearch\Profile\SearchProfileService;
use Hooks;
use Language;
use MediaWiki\Page\PageIdentity;
use MediaWiki\Permissions\RestrictionStore;
use MediaWiki\Revision\RevisionRecord;
use MockTitleTrait;
use OutputPage;
use ParserOutput;
use RawMessage;
use Title;
use TitleFormatter;
use User;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Search\MediaSearchQueryBuilder;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends \MediaWikiIntegrationTestCase {
	use MockTitleTrait;

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
				'original' => 'STRING_1<mw:slotheader>mediainfo</mw:slotheader>STRING_3',
				'expected' => 'STRING_1<mediainfoslotheader />STRING_3',
			],
		];
	}

	/**
	 * @dataProvider providePostCacheTransformInput
	 */
	public function testOnParserOutputPostCacheTransform( $original, $expected ) {
		$parserOutput = $this->createMock( ParserOutput::class );
		WikibaseMediaInfoHooks::onParserOutputPostCacheTransform(
			$parserOutput,
			$original,
			[]
		);
		$this->assertEquals( $expected, $original );
	}

	private function getMockOutputPage( Title $title ) {
		$revision = $this->createMock( RevisionRecord::class );
		$revision->method( 'getId' )
			->willReturn( 999 );

		$out = $this->getMockBuilder( OutputPage::class )
			->disableOriginalConstructor()
			->onlyMethods( [
				'getTitle',
				'getLanguage',
				'getUser',
				'getContext',
				'addJsConfigVars',
				'addModuleStyles',
				'addModules',
				'setPreventClickjacking',
			] )
			->getMock();

		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getLanguage' )
			->willReturn( Language::factory( 'en' ) );
		$out->method( 'getUser' )
			->willReturn( new User() );
		$out->method( 'setPreventClickjacking' );

		// TODO: Test that this doesn't appear on action=history etc. contexts
		$out->method( 'getContext' )
			->willReturn( new \RequestContext() );
		return $out;
	}

	public function testOnBeforePageDisplay() {
		$imgTitle = $this->makeMockTitle( 'Foo.jpg', [ 'namespace' => NS_FILE, 'id' => 13 ] );

		$skin = $this->createMock( \Skin::class );

		$out = $this->getMockOutputPage( $imgTitle );
		$out->expects( $this->once() )
			->method( 'addJsConfigVars' )
			->will( $this->returnCallback(
				function ( $keys ) {
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
		$imgTitle = $this->makeMockTitle( 'Foo.jpg', [ 'namespace' => NS_FILE, 'id' => 0 ] );

		$out = $this->getMockOutputPage( $imgTitle );
		$out->expects( $this->once() )
			->method( 'addJsConfigVars' )
			->will( $this->returnCallback(
				function ( $keys ) {
					$this->assertArrayNotHasKey( 'wbCurrentRevision', $keys );
				}
			) );

		$skin = $this->createMock( \Skin::class );

		WikibaseMediaInfoHooks::onBeforePageDisplay( $out, $skin );
	}

	private function createHookObjectWithMocks() {
		return new WikibaseMediaInfoHooks(
			$this->createMock( EntityIdComposer::class )
		);
	}

	public function testOnGetEntityByLinkedTitleLookup() {
		$lookup = $this->createMock( EntityByLinkedTitleLookup::class );
		WikibaseMediaInfoHooks::onGetEntityByLinkedTitleLookup( $lookup );
		$this->assertInstanceOf(
			MediaInfoByLinkedTitleLookup::class,
			$lookup
		);
	}

	public function testOnCirrusSearchProfileServiceMediaSearch() {
		$this->setMwGlobals( 'wgWBCSUseCirrus', true );
		$this->setMwGlobals( 'wgMediaInfoMediaSearchProfiles', [ 'some-mediasearch-profile' => [] ] );

		$service = $this->createMock( SearchProfileService::class );
		$service->expects( $this->once() )
			->method( 'registerFTSearchQueryRoute' )
			->with(
				MediaSearchQueryBuilder::SEARCH_PROFILE_CONTEXT_NAME,
				$this->anything(),
				$this->containsEqual( NS_FILE )
			);

		WikibaseMediaInfoHooks::onCirrusSearchProfileService( $service );
	}

	public function testGetProtectionMsgIsProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getMockBuilder( Title::class )
			->disableOriginalConstructor()
			->getMock();

		$restrictionStore = $this->getMockBuilder( RestrictionStore::class )
			->disableOriginalConstructor()
			->getMock();
		$restrictionStore->method( 'isProtected' )
			->with( $title, 'edit' )
			->willReturn( true );
		$this->setService( 'RestrictionStore', $restrictionStore );

		$message = $this->getMockBuilder( RawMessage::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->expects( $this->once() )
			->method( 'msg' )
			->withConsecutive( [ 'protectedpagetext', 'editprotected', 'edit' ] )
			->willReturn( $message );
		$wrapper->getProtectionMsg( $out );
	}

	public function testGetProtectionMsgIsSemiProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getMockBuilder( Title::class )
			->disableOriginalConstructor()
			->getMock();

		$restrictionStore = $this->getMockBuilder( RestrictionStore::class )
			->disableOriginalConstructor()
			->getMock();
		$restrictionStore->method( 'isProtected' )
			->with( $title, 'edit' )
			->willReturn( true );
		$restrictionStore->method( 'isSemiProtected' )
			->with( $title, 'edit' )
			->willReturn( true );
		$this->setService( 'RestrictionStore', $restrictionStore );

		$message = $this->getMockBuilder( RawMessage::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->expects( $this->once() )
			->method( 'msg' )
			->withConsecutive( [ 'protectedpagetext', 'editsemiprotected', 'edit' ] )
			->willReturn( $message );
		$wrapper->getProtectionMsg( $out );
	}

	public function testGetProtectionMsgIsCascadeProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$cascadeSource = $this->getMockBuilder( PageIdentity::class )
			->disableOriginalConstructor()
			->getMock();

		$titleFormatter = $this->getMockBuilder( TitleFormatter::class )
			->disableOriginalConstructor()
			->getMock();
		$titleFormatter->method( 'getPrefixedText' )
			->willReturn( 'Cascade Source' );
		$this->setService( 'TitleFormatter', $titleFormatter );

		$restrictionStore = $this->getMockBuilder( RestrictionStore::class )
			->disableOriginalConstructor()
			->getMock();
		$restrictionStore->method( 'isCascadeProtected' )
			->willReturn( true );
		$restrictionStore->method( 'getCascadeProtectionSources' )
			->willReturn( [ [ $cascadeSource ] ] );
		$this->setService( 'RestrictionStore', $restrictionStore );

		$title = $this->getMockBuilder( Title::class )
			->disableOriginalConstructor()
			->getMock();

		$message = $this->getMockBuilder( RawMessage::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->expects( $this->once() )
			->method( 'msg' )
			->withConsecutive( [ 'cascadeprotected', 1, "* [[:Cascade Source]]\n" ] )
			->willReturn( $message );

		$wrapper->getProtectionMsg( $out );
	}

	public function testGetProtectionMsgIsNotProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();

		$title = $this->getMockBuilder( Title::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );

		$this->assertNull( $wrapper->getProtectionMsg( $out ) );
	}

	private function getWrapper() {
		$entityId = $this->getMockBuilder( EntityIdComposer::class )
			->disableOriginalConstructor()
			->getMock();
		$hooks = new WikibaseMediaInfoHooks( $entityId );
		return TestingAccessWrapper::newFromObject( $hooks );
	}

}
