<?php

namespace Wikibase\MediaInfo;

use MediaWiki\Hook\MediaWikiServicesHook;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRoleRegistry;
use Wikibase\MediaInfo\Content\MediaInfoContent;

/**
 * MediaWiki hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0-or-later
 */
class WikibaseMediaInfoServicesHooks implements MediaWikiServicesHook {

	/**
	 * Hook to register the MediaInfo slot role.
	 *
	 * @param MediaWikiServices $services
	 */
	public function onMediaWikiServices( $services ) {
		$services->addServiceManipulator( 'SlotRoleRegistry', static function ( SlotRoleRegistry $registry ) {
			if ( !$registry->isDefinedRole( 'mediainfo' ) ) {
				// Sense check
				$registry->defineRoleWithModel(
					/* role */ 'mediainfo',
					/* content handler */ MediaInfoContent::CONTENT_MODEL_ID
					/*, layout – we want to set "prepend" in future, once MediaWiki supports that */
				);
			}
		} );
	}
}
