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
		$nsLookup = WikibaseRepo::getDefaultInstance()->getEntityNamespaceLookup();
		$mediaInfoNamespace = $nsLookup->getEntityNamespace( MediaInfo::ENTITY_TYPE );

		if ( !is_int( $mediaInfoNamespace ) ) {
			throw new MWException( 'No namespace configured for MediaInfo entities!' );
		}

		return new MediaInfoIdLookup( $mediaInfoNamespace );
	}

	/**
	 * @return FilePageLookup
	 */
	public static function getFilePageLookup() {
		return MediaWikiServices::getInstance()->getService( 'MediaInfoFilePageLookup' );
	}

}
