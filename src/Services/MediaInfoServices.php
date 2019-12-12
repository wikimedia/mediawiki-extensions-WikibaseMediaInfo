<?php

namespace Wikibase\MediaInfo\Services;

use MediaWiki\MediaWikiServices;
use Wikibase\MediaInfo\Content\MediaInfoHandler;

/**
 * @license GPL-2.0-or-later
 * @author Daniel Kinzler
 */
class MediaInfoServices {

	/**
	 * @return MediaInfoIdLookup
	 */
	public static function getMediaInfoIdLookup() {
		return MediaWikiServices::getInstance()->getService( 'MediaInfoIdLookup' );
	}

	/**
	 * @return FilePageLookup
	 */
	public static function getFilePageLookup() {
		return MediaWikiServices::getInstance()->getService( 'MediaInfoFilePageLookup' );
	}

	/**
	 * @return MediaInfoHandler
	 */
	public static function getMediaInfoHandler() {
		return MediaWikiServices::getInstance()->getService( 'MediaInfoHandler' );
	}

}
