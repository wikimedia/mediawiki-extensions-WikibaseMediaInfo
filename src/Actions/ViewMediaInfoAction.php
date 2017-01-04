<?php

namespace Wikibase\MediaInfo\Actions;

use Wikibase\ViewEntityAction;

/**
 * Handles the view action for Wikibase MediaInfo.
 *
 * @since 0.1
 *
 * @license GPL-2.0+
 * @author Adrian Heine <adrian.heine@wikimedia.de>
 */
class ViewMediaInfoAction extends ViewEntityAction {

	/**
	 * @see ViewEntityAction::show
	 */
	public function show() {
		parent::show();

		$this->getOutput()->addModules( 'wikibase.mediainfo.mediainfoview' );
	}

}
