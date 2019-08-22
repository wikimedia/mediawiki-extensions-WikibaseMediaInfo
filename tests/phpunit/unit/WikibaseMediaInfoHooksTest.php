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
		$entityId = $this->getMockBuilder( EntityIdComposer::class )
			->disableOriginalConstructor()
			->getMock();
		$hooks = new WikibaseMediaInfoHooks( $entityId );
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = TestingAccessWrapper::newFromObject( $hooks );
		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$title->method( 'isProtected' )
			->with( 'edit' )
			->willReturn( true );
		$out->method( 'getTitle' )
			->willReturn( $title );
		$message = $this->getMockBuilder( \RawMessage::class )
			->disableOriginalConstructor()
			->getMock();
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
		$entityId = $this->getMockBuilder( EntityIdComposer::class )
			->disableOriginalConstructor()
			->getMock();
		$hooks = new WikibaseMediaInfoHooks( $entityId );
		/** @var WikibaseMediaInfoHooks $wrapper */
		$wrapper = TestingAccessWrapper::newFromObject( $hooks );
		$out = $this->getMockBuilder( \OutputPage::class )
			->disableOriginalConstructor()
			->getMock();
		$title = $this->getMockBuilder( \Title::class )
			->disableOriginalConstructor()
			->getMock();
		$title->method( 'isProtected' )
			->with( 'edit' )
			->willReturn( false );
		$title->method( 'isSemiProtected' )
			->with( 'edit' )
			->willReturn( true );
		$out->method( 'getTitle' )
			->willReturn( $title );
		$message = $this->getMockBuilder( \RawMessage::class )
			->disableOriginalConstructor()
			->getMock();
		$out->expects( $this->once() )
			->method( 'msg' )
			->withConsecutive( [ 'protectedpagetext', 'editsemiprotected', 'edit' ] )
			->willReturn( $message );
		$wrapper->getProtectionMsg( $out );
	}

}
