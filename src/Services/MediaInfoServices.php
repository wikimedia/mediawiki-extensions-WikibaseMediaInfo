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
	 * @param MediaWikiServices|null $services
	 * @return MediaInfoIdLookup
	 */
	public static function getMediaInfoIdLookup( ?MediaWikiServices $services = null ) {
		return ( $services ?? MediaWikiServices::getInstance() )->getService( 'MediaInfoIdLookup' );
	}

	/**
	 * @param MediaWikiServices|null $services
	 * @return FilePageLookup
	 */
	public static function getFilePageLookup( ?MediaWikiServices $services = null ) {
		return ( $services ?? MediaWikiServices::getInstance() )->getService( 'MediaInfoFilePageLookup' );
	}

	/**
	 * @param MediaWikiServices|null $services
	 * @return MediaInfoHandler
	 */
	public static function getMediaInfoHandler( ?MediaWikiServices $services = null ) {
		return ( $services ?? MediaWikiServices::getInstance() )->getService( 'MediaInfoHandler' );
	}

}
