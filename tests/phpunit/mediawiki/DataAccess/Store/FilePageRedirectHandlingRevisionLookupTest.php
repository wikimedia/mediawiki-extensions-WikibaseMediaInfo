<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\DataAccess\Store;

use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use PHPUnit\Framework\TestCase;
use Wikibase\DataModel\Entity\EntityRedirect;
use Wikibase\Lib\Store\EntityRevision;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\InconsistentRedirectException;
use Wikibase\Lib\Store\LookupConstants;
use Wikibase\Lib\Store\Sql\WikiPageEntityDataLoader;
use Wikibase\Lib\Store\StorageException;
use Wikibase\MediaInfo\DataAccess\Store\FilePageRedirectHandlingRevisionLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * @covers \Wikibase\MediaInfo\DataAccess\Store\FilePageRedirectHandlingRevisionLookup
 *
 * @license GPL-2.0-or-later
 */
class FilePageRedirectHandlingRevisionLookupTest extends TestCase {

	public function testGetEntityRevisionReturnsTheEntityRevisionProvidedByDefaultLookup() {
		$entityId = new MediaInfoId( 'M123' );
		$revisionId = 4321;
		$mode = LookupConstants::LATEST_FROM_REPLICA;

		$entityRevision = $this->createMock( EntityRevision::class );

		$defaultLookup = $this->createMock( EntityRevisionLookup::class );
		$defaultLookup
			->method( 'getEntityRevision' )
			->with( $entityId, $revisionId, $mode )
			->willReturn( $entityRevision );

		$lookup = $this->newLookup( $defaultLookup );

		$this->assertSame( $entityRevision, $lookup->getEntityRevision( $entityId, $revisionId, $mode ) );
	}

	public function testGivenConsistentRevisionData_getLatestRevisionIdReturnsTheResultProvidedByDefaultLookup() {
		$entityId = new MediaInfoId( 'M123' );
		$mode = LookupConstants::LATEST_FROM_REPLICA;

		$revisionId = 4321;

		$defaultLookup = $this->createMock( EntityRevisionLookup::class );
		$defaultLookup
			->method( 'getLatestRevisionId' )
			->with( $entityId, $mode )
			// TODO: this is not fully in-par with the interface
			->willReturn( $revisionId );

		$lookup = $this->newLookup( $defaultLookup );

		$this->assertSame( $revisionId, $lookup->getLatestRevisionId( $entityId, $mode ) );
	}

	public function testGivenInconsistentRevisionDataAndEntityDataLoaded_getLatestRevisionIdReturnsIdOfSourceEntity() {
		$entityId = new MediaInfoId( 'M123' );
		$entity = new MediaInfo( $entityId );

		$revisionId = 4321;

		$slotRole = 'mediainfo';
		$mode = LookupConstants::LATEST_FROM_REPLICA;

		$entityRevision = new EntityRevision( $entity, $revisionId );

		$defaultLookup = $this->createMock( EntityRevisionLookup::class );
		$defaultLookup
			->method( 'getLatestRevisionId' )
			->willThrowException( new InconsistentRedirectException( $revisionId, $slotRole ) );

		$revisionStore = $this->createMock( RevisionStore::class );
		$revisionStore
			->method( 'getRevisionById' )
			->willReturn( $this->createMock( RevisionRecord::class ) );

		$loader = $this->createMock( WikiPageEntityDataLoader::class );
		$loader
			->method( 'loadEntityDataFromWikiPageRevision' )
			->willReturn( [ $entityRevision, null ] );

		$lookup = $this->newLookup( $defaultLookup, $revisionStore, $loader );

		$shouldFail = function () {
			$this->fail( 'Expecting concrete revision result' );
		};

		$result = $lookup->getLatestRevisionId( $entityId, $mode );

		$result
			->onConcreteRevision( function ( $id ) use ( $revisionId ) {
				$this->assertSame( $revisionId, $id );
			} )
			->onNonexistentEntity( $shouldFail )
			->onRedirect( $shouldFail )
			->map();
	}

	public function testGivenInconsistentRevisionDataAndRedirectDataLoaded_getLatestRevisionIdReturnsRedirectResult() {
		$entityId = new MediaInfoId( 'M123' );
		$revisionId = 4321;
		$slotRole = 'mediainfo';
		$mode = LookupConstants::LATEST_FROM_REPLICA;

		$defaultLookup = $this->createMock( EntityRevisionLookup::class );
		$defaultLookup
			->method( 'getLatestRevisionId' )
			->willThrowException( new InconsistentRedirectException( $revisionId, $slotRole ) );

		$revisionStore = $this->createMock( RevisionStore::class );
		$revisionStore
			->method( 'getRevisionById' )
			->willReturn( $this->createMock( RevisionRecord::class ) );

		$loader = $this->createMock( WikiPageEntityDataLoader::class );
		$loader
			->method( 'loadEntityDataFromWikiPageRevision' )
			->willReturn( [ null, null ] );

		$lookup = $this->newLookup( $defaultLookup, $revisionStore, $loader );

		$this->expectException( StorageException::class );

		$lookup->getLatestRevisionId( $entityId, $mode );
	}

	public function testGivenInconsistentRevisionDataAndNoDataLoaded_getLatestRevisionIdThrows() {
		$sourceEntityId = new MediaInfoId( 'M123' );
		$targetEntityId = new MediaInfoId( 'M789' );

		$revisionId = 4321;

		$slotRole = 'mediainfo';
		$mode = LookupConstants::LATEST_FROM_REPLICA;

		$entityRedirect = new EntityRedirect( $sourceEntityId, $targetEntityId );

		$defaultLookup = $this->createMock( EntityRevisionLookup::class );
		$defaultLookup
			->method( 'getLatestRevisionId' )
			->willThrowException( new InconsistentRedirectException( $revisionId, $slotRole ) );

		$revisionStore = $this->createMock( RevisionStore::class );
		$revisionStore
			->method( 'getRevisionById' )
			->willReturn( $this->createMock( RevisionRecord::class ) );

		$loader = $this->createMock( WikiPageEntityDataLoader::class );
		$loader
			->method( 'loadEntityDataFromWikiPageRevision' )
			->willReturn( [ null, $entityRedirect ] );

		$lookup = $this->newLookup( $defaultLookup, $revisionStore, $loader );

		$shouldFail = function () {
			$this->fail( 'Expecting redirect revision result' );
		};

		$result = $lookup->getLatestRevisionId( $sourceEntityId, $mode );

		$result
			->onConcreteRevision( $shouldFail )
			->onNonexistentEntity( $shouldFail )
			->onRedirect( function ( $revId, $targetId ) use ( $revisionId, $targetEntityId ) {
				$this->assertSame( $revisionId, $revId );
				$this->assertEquals( $targetEntityId, $targetId );
			} )
			->map();
	}

	private function newLookup(
		EntityRevisionLookup $defaultLookup,
		RevisionStore $revisionStore = null,
		WikiPageEntityDataLoader $entityDataLoader = null
	) {
		$revisionStore = $revisionStore ?? $this->createMock( RevisionStore::class );
		$entityDataLoader = $entityDataLoader ?? $this->createMock( WikiPageEntityDataLoader::class );

		return new FilePageRedirectHandlingRevisionLookup( $defaultLookup, $revisionStore, $entityDataLoader );
	}

}
