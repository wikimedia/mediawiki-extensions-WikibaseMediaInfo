<?php

namespace Wikibase\MediaInfo\Tests\Unit;

use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;
use Wikimedia\TestingAccessWrapper;

/**
 * @coversDefaultClass \Wikibase\MediaInfo\WikibaseMediaInfoHooks
 */
class WikibaseMediaInfoHooksTest extends \MediaWikiUnitTestCase {

	/**
	 * @covers ::getProtectionMsg
	 */
	public function testGetProtectionMsgIsProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getProtectedTitle();

		$message = $this->getMockBuilder( \RawMessage::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( \OutputPage::class )
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

	/**
	 * @covers ::getProtectionMsg
	 */
	public function testGetProtectionMsgIsSemiProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getSemiProtectedTitle();

		$message = $this->getMockBuilder( \RawMessage::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( \OutputPage::class )
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

	/**
	 * @covers ::getProtectionMsg
	 */
	public function testGetProtectionMsgIsCascadeProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getCascadeProtectedTitle();

		$message = $this->getMockBuilder( \RawMessage::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->expects( $this->once() )
			->method( 'msg' )
			->withConsecutive( [ 'cascadeprotected', 1, '* [[:Cascade Source]]\n' ] )
			->willReturn( $message );
		$wrapper->getProtectionMsg( $out );
	}

	/**
	 * @covers ::getProtectionMsg
	 */
	public function testGetProtectionMsgIsNotProtected() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();

		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );

		$this->assertNull( $wrapper->getProtectionMsg( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAdminUserProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getProtectedTitle();
		$user = $this->getAdminUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertTrue( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAdminUserSemiProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getSemiProtectedTitle();
		$user = $this->getAdminUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertTrue( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAdminUserCascadeProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getCascadeProtectedTitle();
		$user = $this->getAdminUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertTrue( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAdminUserNoProtection() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$user = $this->getAdminUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertTrue( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAuthedUserProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getProtectedTitle();
		$user = $this->getAuthedUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertFalse( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAuthedUserSemiProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getSemiProtectedTitle();
		$user = $this->getAuthedUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertTrue( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAuthedUserCascadeProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getCascadeProtectedTitle();
		$user = $this->getAuthedUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertFalse( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAuthedUserNoProtection() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$user = $this->getAuthedUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertTrue( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAnonUserProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getProtectedTitle();
		$user = $this->getAnonUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertFalse( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAnonUserSemiProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getSemiProtectedTitle();
		$user = $this->getAnonUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertFalse( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAnonUserCascadeProtectedPage() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getCascadeProtectedTitle();
		$user = $this->getAnonUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertFalse( $wrapper->userCanEdit( $out ) );
	}

	/**
	 * @covers ::userCanEdit
	 */
	public function testUserCanEditAnonUserNoProtection() {
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = $this->getWrapper();
		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$user = $this->getAnonUser();

		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->method( 'getTitle' )
			->willReturn( $title );
		$out->method( 'getUser' )
			->willReturn( $user );

		$this->assertTrue( $wrapper->userCanEdit( $out ) );
	}

	private function getWrapper() {
		$entityId = $this->getMockBuilder( EntityIdComposer::class )
			->disableOriginalConstructor()
			->getMock();
		$hooks = new WikibaseMediaInfoHooks( $entityId );
		return TestingAccessWrapper::newFromObject( $hooks );
	}

	private function getProtectedTitle() {
		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$title->method( 'isProtected' )
			->with( 'edit' )
			->willReturn( true );

		return $title;
	}

	private function getSemiProtectedTitle() {
		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$title->method( 'isProtected' )
			->with( 'edit' )
			->willReturn( true );
		$title->method( 'isSemiProtected' )
			->with( 'edit' )
			->willReturn( true );

		return $title;
	}

	private function getCascadeProtectedTitle() {
		$cascadeSource = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$cascadeSource->method( 'getPrefixedText' )
			->willReturn( 'Cascade Source' );

		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$title->method( 'isCascadeProtected' )
			->willReturn( true );
		$title->method( 'getCascadeProtectionSources' )
			->willReturn( [ [ $cascadeSource ] ] );

		return $title;
	}

	private function getAdminUser() {
		$user = $this->getMockBuilder( \User::class )
			->disableOriginalConstructor()
			->getMock();
		$user->method( 'isAnon' )
			->willReturn( false );
		$user->method( 'getGroups' )
			->willReturn( [ 'sysop' ] );

		return $user;
	}

	private function getAuthedUser() {
		$user = $this->getMockBuilder( \User::class )
			->disableOriginalConstructor()
			->getMock();
		$user->method( 'isAnon' )
			->willReturn( false );
		$user->method( 'getGroups' )
			->willReturn( [] );

		return $user;
	}

	private function getAnonUser() {
		$user = $this->getMockBuilder( \User::class )
			->disableOriginalConstructor()
			->getMock();
		$user->method( 'isAnon' )
			->willReturn( true );
		$user->method( 'getGroups' )
			->willReturn( [] );

		return $user;
	}

}
