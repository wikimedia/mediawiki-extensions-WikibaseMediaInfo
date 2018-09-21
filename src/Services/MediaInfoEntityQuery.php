<?php

namespace Wikibase\MediaInfo\Services;

use Wikibase\DataModel\Entity\EntityId;
use Wikibase\Lib\Store\Sql\PageTableEntityQueryBase;
use Wikibase\MediaInfo\DataModel\MediaInfoId;

/**
 * PageTableEntityQuery that assumes the entity IDs numeric part matches page_id of the page
 * that the MediaInfo item occupies a slot on.
 *
 * For example: An MediaInfo item with ID M999 will occupy a slot on a Page with id 999
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityQuery extends PageTableEntityQueryBase {

	/**
	 * @param MediaInfoId $entityId
	 * @return array SQL condition
	 */
	protected function getConditionForEntityId( EntityId $entityId ) {
		return [ 'page_id' => $entityId->getNumericId() ];
	}

	protected function getEntityIdStringFromRow( \stdClass $row ) {
		return 'M' . $row->page_id;
	}

	protected function getFieldsNeededForMapping() {
		return [ 'page_id' ];
	}

}
