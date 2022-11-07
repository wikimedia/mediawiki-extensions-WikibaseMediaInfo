<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\DataAccess\Store;

use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Wikibase\Lib\Store\DivergingEntityIdException;
use Wikibase\Lib\Store\EntityRevision;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\LookupConstants;
use Wikibase\MediaInfo\DataAccess\Store\EntityIdFixingRevisionLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * @covers \Wikibase\MediaInfo\DataAccess\Store\EntityIdFixingRevisionLookup
 */
class EntityIdFixingRevisionLookupTest extends TestCase {

	private $defaultLookup;
	private $logger;

	protected function setUp(): void {
		$this->defaultLookup = $this->createMock( EntityRevisionLookup::class );
		$this->logger = $this->createMock( LoggerInterface::class );
	}

	public function testGetEntityRevisionDelegatesCallToDefaultLookupAndReturnsEntityRevision() {
		$entityId = new MediaInfoId( 'M123' );
		$revisionId = 4711;
		$mode = LookupConstants::LATEST_FROM_REPLICA;

		$entityRevision = $this->createMock( EntityRevision::class );

		$this->defaultLookup->expects( $this->once() )
			->method( 'getEntityRevision' )
			->with( $entityId, $revisionId, $mode )
			->willReturn( $entityRevision );

		$lookup = $this->getEntityIdFixingRevisionLookup();

		$this->assertSame(
			$entityRevision,
			$lookup->getEntityRevision( $entityId, $revisionId, $mode )
		);
	}

	public function testFixesEntityIdInsideEntityRevisionOnDivergingEntityIdException() {
		$newEntityId = new MediaInfoId( 'M1235' );
		$oldEntityId = new MediaInfoId( 'M1234' );
		$revisionId = 4711;
		$mode = LookupConstants::LATEST_FROM_REPLICA;
		$warningMessage = "Revision 4711 belongs to M1234 instead of expected 1235";

		$entityRevision = new EntityRevision(
			new MediaInfo( $oldEntityId ),
			$revisionId,
			'20160114180301'
		);
		$exception = new DivergingEntityIdException(
			$revisionId,
			$entityRevision,
			$newEntityId->getSerialization()
		);

		$this->defaultLookup->expects( $this->once() )
			->method( 'getEntityRevision' )
			->willThrowException( $exception );

		$this->logger->expects( $this->once() )
			->method( 'warning' )
			->with(
				'Revision {revisionId} belongs to {actualEntityId} instead of expected {entityId}',
				[
					'revisionId' => $revisionId,
					'actualEntityId' => $oldEntityId->getSerialization(),
					'entityId' => $newEntityId->getSerialization()
				],
			);
		$lookup = $this->getEntityIdFixingRevisionLookup();

		$actualEntityRevision = $lookup->getEntityRevision( $newEntityId, $revisionId, $mode );
		$this->assertSame( $entityRevision, $actualEntityRevision );
		$this->assertSame( $newEntityId, $actualEntityRevision->getEntity()->getId() );
	}

	public function testGetLatestRevisionIdDelegatesCallToDefaultLookupAndReturnsRevisionId() {
		$entityId = new MediaInfoId( 'M123' );
		$mode = LookupConstants::LATEST_FROM_REPLICA;
		$revisionId = 4711;

		$this->defaultLookup->expects( $this->once() )
			->method( 'getLatestRevisionId' )
			->with( $entityId, $mode )
			->willReturn( $revisionId );

		$lookup = $this->getEntityIdFixingRevisionLookup();

		$this->assertSame(
			$revisionId,
			$lookup->getLatestRevisionId( $entityId, $mode )
		);
	}

	private function getEntityIdFixingRevisionLookup() {
		return new EntityIdFixingRevisionLookup( $this->defaultLookup, $this->logger );
	}

}
