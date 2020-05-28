<?php

namespace Wikibase\MediaInfo\Services;

use Title;
use TitleFactory;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * Lookup service for getting the Title of the page in the File namespace that corresponds
 * to a given MediaInfoId.
 *
 * @license GPL-2.0-or-later
 * @author Daniel Kinzler
 */
class FilePageLookup {

	/**
	 * @var TitleFactory
	 */
	private $titleFactory;

	public function __construct( TitleFactory $titleFactory ) {
		$this->titleFactory = $titleFactory;
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
