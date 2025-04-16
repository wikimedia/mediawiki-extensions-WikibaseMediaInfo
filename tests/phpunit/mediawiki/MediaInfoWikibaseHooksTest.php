<?php

declare( strict_types = 1 );

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\MediaInfoWikibaseHooks;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;

/**
 * @covers \Wikibase\MediaInfo\MediaInfoWikibaseHooks
 *
 * @group WikibaseMediaInfo
 * @group Database
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoWikibaseHooksTest extends \MediaWikiIntegrationTestCase {

	public function testOnWikibaseRepoEntityNamespaces() {
		$entityNamespaces = [];
		( new MediaInfoWikibaseHooks() )->onWikibaseRepoEntityNamespaces( $entityNamespaces );
		$this->assertArrayHasKey( MediaInfo::ENTITY_TYPE, $entityNamespaces );
	}

	public function testOnWikibaseClientEntityTypes() {
		$entityTypeDefinitions = [];
		( new MediaInfoWikibaseHooks() )->onWikibaseClientEntityTypes( $entityTypeDefinitions );
		$this->assertArrayHasKey( 'mediainfo', $entityTypeDefinitions );
	}

	public function testOnWikibaseRepoEntityTypes() {
		$entityTypeDefinitions = [];
		( new MediaInfoWikibaseHooks() )->onWikibaseRepoEntityTypes( $entityTypeDefinitions );
		$this->assertArrayHasKey( 'mediainfo', $entityTypeDefinitions );
	}

	public function testOnGetEntityByLinkedTitleLookup() {
		$lookup = $this->createMock( EntityByLinkedTitleLookup::class );
		( new MediaInfoWikibaseHooks )->onGetEntityByLinkedTitleLookup( $lookup );
		$this->assertInstanceOf(
			MediaInfoByLinkedTitleLookup::class,
			$lookup
		);
	}

}
