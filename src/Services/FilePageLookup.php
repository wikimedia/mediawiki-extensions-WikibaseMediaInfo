<?php

namespace Wikibase\MediaInfo\Services;

use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * Lookup service for getting the Title of the page in the File namespace that corresponds
 * to a given MediaInfoId.
 *
 * @license GPL-2.0-or-later
 * @author Daniel Kinzler
 */
class FilePageLookup {

	public function __construct(
		private readonly TitleFactory $titleFactory,
	) {
	}

	/**
	 * @param MediaInfoId $mediaInfoId
	 *
	 * @return Title|null The Title of the page in the File namespace that corresponds to
	 * the given MediaInfo, or null if there is no such page.
	 */
	public function getFilePage( MediaInfoId $mediaInfoId ) {
		$pageId = $mediaInfoId->getNumericId();

		$filePageTitle = $this->titleFactory->newFromID( $pageId );

		if ( !$filePageTitle ) {
			return null;
		}

		if ( $filePageTitle->inNamespace( NS_FILE ) ) {
			return $filePageTitle;
		}

		return null;
	}
}
