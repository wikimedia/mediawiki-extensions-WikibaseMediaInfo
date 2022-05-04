<?php

namespace Wikibase\MediaInfo\DataAccess\Store;

use IDBAccessObject;
use MediaWiki\Revision\RevisionStore;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\InconsistentRedirectException;
use Wikibase\Lib\Store\LatestRevisionIdResult;
use Wikibase\Lib\Store\LookupConstants;
use Wikibase\Lib\Store\Sql\WikiPageEntityDataLoader;
use Wikibase\Lib\Store\StorageException;

/**
 * This service works around (intended behaviour does not seem fully defined as of 2019-10)
 * issues that arise when the file page is marked as a redirected (e.g. by an edit to
 * file page's wikitext content adding #REDIRECT) but the mediainfo entity data "slot"
 * does not contain "entity redirect" data but "regular" entity data.
 *
 * In such cases, getLatestRevisionId returns the revision ID of the Entity related to
 * the "source" file page, not of the entity related to the file page the page redirects to.
 *
 * For details see: https://phabricator.wikimedia.org/T229280
 *
 * @license GPL-2.0-or-later
 */
class FilePageRedirectHandlingRevisionLookup implements EntityRevisionLookup {

	/**
	 * @var EntityRevisionLookup
	 */
	private $lookup;

	/**
	 * @var RevisionStore
	 */
	private $revisionStore;

	/**
	 * @var WikiPageEntityDataLoader
	 */
	private $entityDataLoader;

	public function __construct(
		EntityRevisionLookup $lookup,
		RevisionStore $revisionStore,
		WikiPageEntityDataLoader $entityDataLoader
	) {
		$this->lookup = $lookup;
		$this->revisionStore = $revisionStore;
		$this->entityDataLoader = $entityDataLoader;
	}

	public function getEntityRevision(
		EntityId $entityId,
		$revisionId = 0,
		$mode = LookupConstants::LATEST_FROM_REPLICA
	) {
		return $this->lookup->getEntityRevision( $entityId, $revisionId, $mode );
	}

	public function getLatestRevisionId( EntityId $entityId, $mode = LookupConstants::LATEST_FROM_REPLICA ) {
		try {
			return $this->lookup->getLatestRevisionId( $entityId, $mode );
		} catch ( InconsistentRedirectException $e ) {
			$revStoreFlags = ( $mode == LookupConstants::LATEST_FROM_MASTER
				|| $mode == LookupConstants::LATEST_FROM_REPLICA_WITH_FALLBACK )
				? IDBAccessObject::READ_LATEST : 0;

			// TODO: WikiPageEntityMetaDataLookup should use RevisionStore::getQueryInfo,
			// then we could use RevisionStore::newRevisionFromRow here!
			$revisionId = $e->getRevisionId();
			$slotRole = $e->getSlotRole();
			$revision = $this->revisionStore->getRevisionById( $revisionId, $revStoreFlags );
			list( $entityRevision, $redirect ) = $this->entityDataLoader->loadEntityDataFromWikiPageRevision(
				$revision, $slotRole, $revStoreFlags
			);

			if ( $redirect ) {
				return LatestRevisionIdResult::redirect(
					$revisionId,
					$redirect->getTargetId()
				);
			}
			// Otherwise, if a valid entity document can be created, return the latest revision ID.
			if ( $entityRevision ) {
				return LatestRevisionIdResult::concreteRevision( $revisionId, $entityRevision->getTimestamp() );
			}
			// Otherwise, something is wrong.
			throw new StorageException(
				'The serialized data of revision ' . $revisionId
				. ' contains neither an Entity nor an EntityRedirect!'
			);
		}
	}

}
