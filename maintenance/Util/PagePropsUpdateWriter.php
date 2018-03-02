<?php

namespace Wikibase\MediaInfo\Maintenance\Util;

use BatchRowWriter;
use MediaWiki\MediaWikiServices;

/**
 * Writes updates to DB for CreatePageProps maintenance script.
 *
 * @license GPL-2.0-or-later
 */
class PagePropsUpdateWriter extends BatchRowWriter {

	/**
	 * @inheritDoc
	 */
	public function write( array $updates ) {
		$lbFactory = MediaWikiServices::getInstance()->getDBLoadBalancerFactory();

		$updates = array_column( $updates, 'changes' );
		$this->db->insert(
			$this->table,
			$updates,
			__METHOD__
		);

		$lbFactory->waitForReplication();
	}

}
