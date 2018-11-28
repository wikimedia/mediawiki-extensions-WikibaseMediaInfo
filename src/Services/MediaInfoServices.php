<?php

namespace Wikibase\MediaInfo\Services;

use MediaWiki\MediaWikiServices;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\MediaInfo\DataModel\MediaInfo;

/**
 * @license GPL-2.0-or-later
 * @author Daniel Kinzler
 */
class MediaInfoServices {

	/**
	 * @return MediaInfoIdLookup
	 */
	public static function getMediaInfoIdLookup() {
		return new MediaInfoIdLookup(
			WikibaseRepo::getDefaultInstance()->getEntityNamespaceLookup()->getEntityNamespace(
				MediaInfo::ENTITY_TYPE
			)
		);
	}

	/**
	 * @return FilePageLookup
	 */
	public static function getFilePageLookup() {
		return MediaWikiServices::getInstance()->getService( 'MediaInfoFilePageLookup' );
	}

}
