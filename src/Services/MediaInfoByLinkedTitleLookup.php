<?php

namespace Wikibase\MediaInfo\Services;

use Title;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\WikibaseRepo;

/**
 * Lookup class for getting the MediaInfoId that corresponds to a file page.
 *
 * @license GPL 2+
 * @author Mark Holmquist
 */
class MediaInfoByLinkedTitleLookup implements EntityByLinkedTitleLookup {
	/**
	 * @var EntityByLinkedTitleLookup
	 */
	private $defaultLookup;

	/**
	 * @param EntityByLinkedTitleLookup $defaultLookup
	 */
	public function __construct( EntityByLinkedTitleLookup $defaultLookup ) {
		$this->defaultLookup = $defaultLookup;
	}

	/**
	 * Fetch the entity ID for the file page.
	 *
	 * @param string $globalSiteId
	 * @param string $pageTitle
	 *
	 * @return EntityId|null
	 */
	public function getEntityIdForLinkedTitle( $globalSiteId, $pageTitle ) {
		// Ignore site, assume title is local...
		$title = Title::newFromText( $pageTitle );

		if ( !$title->inNamespace( NS_FILE ) ) {
			return $this->defaultLookup->getEntityIdForLinkedTitle( $globalSiteId, $pageTitle );
		}

		$pageId = $title->getArticleID();

		if ( !$pageId ) {
			return null;
		}

		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		$entityId = $wikibaseRepo->getEntityIdComposer()->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		);

		return $entityId;
	}

}
