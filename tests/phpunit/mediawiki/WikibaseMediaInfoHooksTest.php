<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use Hooks;
use MediaWiki\MediaWikiServices;
use PHPUnit_Framework_TestCase;
use Title;
use Wikibase\Repo\WikibaseRepo;

/**
 * @covers Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends \PHPUnit_Framework_TestCase {

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

	public function testOnSetupAfterCache() {
		global $wgExtraNamespaces;

		// The SetupAfterCache hook already ran.
		// We now just check that it did what it should.
		$config = MediaWikiServices::getInstance()->getMainConfig();
		$entityNamespace = $config->get( 'MediaInfoNamespace' );

		if ( $entityNamespace === false ) {
			$this->markTestSkipped( 'MediaInfoNamespace is set to false,' .
				' disabling automatic namespace registration.' );
		}

		$this->assertArrayHasKey( $entityNamespace, $wgExtraNamespaces );
	}

	public function testOnSetupAfterCache_talk() {
		global $wgExtraNamespaces;

		// The SetupAfterCache hook already ran.
		// We now just check that it did what it should.
		$config = MediaWikiServices::getInstance()->getMainConfig();
		$talkNamespace = $config->get( 'MediaInfoTalkNamespace' );

		if ( $talkNamespace === false ) {
			$this->markTestSkipped( 'MediaInfoTalkNamespace is set to false,' .
				' disabling automatic namespace registration.' );
		}

		$this->assertArrayHasKey( $talkNamespace, $wgExtraNamespaces );
	}

	public function provideWikibaseEntityTypesHooks() {
		return [
			[ 'WikibaseRepoEntityTypes' ],
		    [ 'WikibaseClientEntityTypes' ]
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

	public function testOnMediaWikiServices() {
		$services = $this->getMockBuilder( MediaWikiServices::class )
			->disableOriginalConstructor()
			->getMock();

		$allFiles = [];
		$services->expects( $this->atLeastOnce() )
			->method( 'loadWiringFiles' )
			->will( $this->returnCallback( function( $files ) use ( &$allFiles ) {
				$allFiles = array_merge( $allFiles, $files );
			} ) );

		Hooks::run( 'MediaWikiServices', [ $services ] );

		$this->assertRegExp( '@/MediaInfoServiceWiring\.php$@m', join( "\n", $allFiles ) );
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

}
