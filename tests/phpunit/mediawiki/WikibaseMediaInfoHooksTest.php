<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use CirrusSearch\Profile\SearchProfileService;
use MediaWiki\Context\RequestContext;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Language\RawMessage;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\PageIdentity;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Permissions\RestrictionStore;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFormatter;
use MediaWiki\User\User;
use MockTitleTrait;
use Wikibase\MediaInfo\Search\MediaSearchQueryBuilder;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @group WikibaseMediaInfo
 * @group Database
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends \MediaWikiIntegrationTestCase {
	use MockTitleTrait;

	public static function providePostCacheTransformInput() {
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
		$options = [];
		( new WikibaseMediaInfoHooks( $this->createMock( HookContainer::class ) ) )
			->onParserOutputPostCacheTransform(
				$parserOutput,
				$original,
				$options
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
			->willReturn( $this->getServiceContainer()->getLanguageFactory()->getLanguage( 'en' ) );
		$out->method( 'getUser' )
			->willReturn( new User() );
		$out->method( 'setPreventClickjacking' );

		// TODO: Test that this doesn't appear on action=history etc. contexts
		$out->method( 'getContext' )
			->willReturn( new RequestContext() );
		return $out;
	}

	public function testOnBeforePageDisplay() {
		$imgTitle = $this->makeMockTitle( 'Foo.jpg', [ 'namespace' => NS_FILE, 'id' => 13 ] );

		$skin = $this->createMock( \Skin::class );

		$out = $this->getMockOutputPage( $imgTitle );
		$out->expects( $this->once() )
			->method( 'addJsConfigVars' )
			->willReturnCallback(
				function ( $keys ) {
					$this->assertArrayHasKey( 'wbCurrentRevision', $keys );
				}
			);
		$out->expects( $this->once() )
			->method( 'addModuleStyles' );
		$out->expects( $this->once() )
			->method( 'addModules' );

		( new WikibaseMediaInfoHooks( $this->createMock( HookContainer::class ) ) )
			->onBeforePageDisplay( $out, $skin );
	}

	public function testOnBeforePageDisplayWithMissingTitle() {
		$imgTitle = $this->makeMockTitle( 'Foo.jpg', [ 'namespace' => NS_FILE, 'id' => 0 ] );

		$out = $this->getMockOutputPage( $imgTitle );
		$out->expects( $this->once() )
			->method( 'addJsConfigVars' )
			->willReturnCallback(
				function ( $keys ) {
					$this->assertArrayNotHasKey( 'wbCurrentRevision', $keys );
				}
			);

		$skin = $this->createMock( \Skin::class );

		( new WikibaseMediaInfoHooks( $this->createMock( HookContainer::class ) ) )
			->onBeforePageDisplay( $out, $skin );
	}

	public function testOnCirrusSearchProfileServiceMediaSearch() {
		$this->markTestSkippedIfExtensionNotLoaded( 'CirrusSearch' );
		$this->overrideConfigValues( [
			'WBCSUseCirrus' => true,
			'MediaInfoMediaSearchProfiles' => [ 'some-mediasearch-profile' => [] ],
		] );

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
		$title = $this->createMock( Title::class );

		$restrictionStore = $this->createMock( RestrictionStore::class );
		$restrictionStore->method( 'isProtected' )
			->with( $title, 'edit' )
			->willReturn( true );
		$this->setService( 'RestrictionStore', $restrictionStore );

		$message = $this->createMock( RawMessage::class );

		$out = $this->createMock( OutputPage::class );
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->expects( $this->once() )
			->method( 'msg' )
			->with( 'protectedpagetext', 'editprotected', 'edit' )
			->willReturn( $message );
		$wrapper->getProtectionMsg( $out );
	}

	public function testGetProtectionMsgIsSemiProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->createMock( Title::class );

		$restrictionStore = $this->createMock( RestrictionStore::class );
		$restrictionStore->method( 'isProtected' )
			->with( $title, 'edit' )
			->willReturn( true );
		$restrictionStore->method( 'isSemiProtected' )
			->with( $title, 'edit' )
			->willReturn( true );
		$this->setService( 'RestrictionStore', $restrictionStore );

		$message = $this->createMock( RawMessage::class );

		$out = $this->createMock( OutputPage::class );
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->expects( $this->once() )
			->method( 'msg' )
			->with( 'protectedpagetext', 'editsemiprotected', 'edit' )
			->willReturn( $message );
		$wrapper->getProtectionMsg( $out );
	}

	public function testGetProtectionMsgIsCascadeProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$cascadeSource = $this->createMock( PageIdentity::class );

		$titleFormatter = $this->createMock( TitleFormatter::class );
		$titleFormatter->method( 'getPrefixedText' )
			->willReturn( 'Cascade Source' );
		$this->setService( 'TitleFormatter', $titleFormatter );

		$restrictionStore = $this->createMock( RestrictionStore::class );
		$restrictionStore->method( 'isCascadeProtected' )
			->willReturn( true );
		$restrictionStore->method( 'getCascadeProtectionSources' )
			->willReturn( [ [ $cascadeSource ] ] );
		$this->setService( 'RestrictionStore', $restrictionStore );

		$title = $this->createMock( Title::class );

		$message = $this->createMock( RawMessage::class );

		$out = $this->createMock( OutputPage::class );
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->expects( $this->once() )
			->method( 'msg' )
			->with( 'cascadeprotected', 1, "* [[:Cascade Source]]\n" )
			->willReturn( $message );

		$wrapper->getProtectionMsg( $out );
	}

	public function testGetProtectionMsgIsNotProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();

		$title = $this->createMock( Title::class );

		$out = $this->createMock( OutputPage::class );
		$out->method( 'getTitle' )
			->willReturn( $title );

		$this->assertNull( $wrapper->getProtectionMsg( $out ) );
	}

	private function getWrapper() {
		$hooks = new WikibaseMediaInfoHooks( $this->createMock( HookContainer::class ) );
		return TestingAccessWrapper::newFromObject( $hooks );
	}

}
