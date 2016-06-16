<?php

namespace Wikibase\MediaInfo\Services;

use Title;
use Wikibase\Client\Store\TitleFactory;
use Wikibase\Lib\Store\StorageException;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * Lookup service for getting the Title of the page in the File namespace that corresponds
 * to a given MediaInfoId.
 *
 * @license GPL 2+
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
		// TODO: Fix this hack. $mediaInfoId should have getNumericId() (or getPageId()).
		$pageId = (int)substr( $mediaInfoId->getSerialization(), 1 );

		try {
			$filePageTitle = $this->titleFactory->newFromID( $pageId );

			if ( $filePageTitle->inNamespace( NS_FILE ) ) {
				return $filePageTitle;
			}
		} catch ( StorageException $ex ) {
			// no such page
		}

		return null;
	}

}
