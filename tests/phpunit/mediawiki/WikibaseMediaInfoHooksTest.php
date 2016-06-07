<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use Hooks;
use MediaWiki\MediaWikiServices;
use PHPUnit_Framework_TestCase;
use Wikibase\Repo\WikibaseRepo;

/**
 * @covers Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends \PHPUnit_Framework_TestCase {

	public function testOnUnitTestsList() {
		$paths = [];

		Hooks::run( 'UnitTestsList', [ &$paths ] );

		$paths = array_map( 'realpath', $paths );
		$expected = realpath( __DIR__ . '/../' );

		$this->assertContains( $expected, $paths );
	}

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
		$namespaces = $namespaceLookup->getEntityNamespaces();

		$this->assertArrayHasKey( 'mediainfo', $namespaces );
		$this->assertSame( $entityNamespace, $namespaces['mediainfo'] );
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
		$services->expects( $this->once() )
			->method( 'loadWiringFiles' )
			->will( $this->returnCallback( function( $files ) use ( &$allFiles ) {
				$allFiles = array_merge( $allFiles, $files );
			} ) );

		Hooks::run( 'MediaWikiServices', [ $services ] );

		$this->assertRegExp( '@/MediaInfoServiceWiring\.php$@m', join( "\n", $allFiles ) );
	}

}
