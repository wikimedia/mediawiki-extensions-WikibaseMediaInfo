<?php

namespace Wikibase\MediaInfo\DataAccess\Store;

use Psr\Log\LoggerInterface;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\Lib\Store\DivergingEntityIdException;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\LookupConstants;

/**
 * This is an EntityRevisionLookup which works around that fact that assumptions
 * that were made during the creation of MediaInfo, "the entity IDs numeric
 * part matches page_id of the page" (see MediaInfoEntityQuery), are occasionally
 * not true if a page was deleted and then restored.
 * The "new" page however contains a copy of the entity with its previous id and
 * we can modify it to have the old data but new id.
 * We may be able to remove this once https://phabricator.wikimedia.org/T193690
 * is implemented and old pages are somehow cleaned up.
 *
 * @license GPL-2.0-or-later
 */
class EntityIdFixingRevisionLookup implements EntityRevisionLookup {

	/**
	 * @var EntityRevisionLookup
	 */
	private $lookup;

	/**
	 * @var LoggerInterface
	 */
	private $logger;

	public function __construct( EntityRevisionLookup $lookup, LoggerInterface $logger ) {
		$this->lookup = $lookup;
		$this->logger = $logger;
	}

	/**
	 * @inheritDoc
	 */
	public function getEntityRevision(
		EntityId $entityId,
		$revisionId = 0,
		$mode = LookupConstants::LATEST_FROM_REPLICA
	) {
		try {
			$entityRevision = $this->lookup->getEntityRevision( $entityId, $revisionId, $mode );
		} catch ( DivergingEntityIdException $exception ) {
			// TODO "correct" log level?
			$this->logger->warning(
				...$exception->getNormalizedDataForLogging()
			);

			$entityRevision = $exception->getEntityRevision();
			$entityRevision->getEntity()->setId( $entityId );
		}
		return $entityRevision;
	}

	/**
	 * @inheritDoc
	 */
	public function getLatestRevisionId( EntityId $entityId, $mode = LookupConstants::LATEST_FROM_REPLICA ) {
		return $this->lookup->getLatestRevisionId( $entityId, $mode );
	}

}
