<?php

namespace Wikibase\MediaInfo\Services;

use MediaWiki\Revision\SlotRoleHandler;
use MediaWiki\Linker\LinkTarget;

/**
 * @license GPL-2.0-or-later
 */
class WikibaseMediaInfoSlotRoleHandler extends SlotRoleHandler {

	public function __construct() {
		parent::__construct(
			/* role */ 'mediainfo',
			/* content handler */ \Wikibase\MediaInfo\Content\MediaInfoContent::CONTENT_MODEL_ID
			/*, layout – we want to set "prepend" in future, once MediaWiki supports that */
		);
	}

	public function isAllowedModel( $model, LinkTarget $page ) {
		// If we're in NS_FILE, let the parent determine for us (currently, based on content model).
		return (
			$page->getNamespace() === NS_FILE &&
			parent::isAllowedModel( $model, $page )
		);
	}

}
