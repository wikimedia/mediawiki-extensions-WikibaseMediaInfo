<?php

namespace Wikibase\MediaInfo\Maintenance\Util;

use RowUpdateGenerator;
use Wikibase\Lib\EntityIdComposer;
use Wikibase\MediaInfo\DataModel\MediaInfo;

/**
 * Generates update rows for CreatePageProps maintenance script.
 *
 * @license GPL-2.0+
 */
class PagePropsUpdateGenerator implements RowUpdateGenerator {

	/**
	 * @var EntityIdComposer
	 */
	private $entityIdComposer;

	/**
	 * @param EntityIdComposer $entityIdComposer
	 */
	public function __construct( EntityIdComposer $entityIdComposer ) {
		$this->entityIdComposer = $entityIdComposer;
	}

	/**
	 * @inheritDoc
	 */
	public function update( $row ) {
		$entityId = $this->entityIdComposer->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$row->page_id
		);

		return [
			'pp_page' => $row->page_id,
			'pp_propname' => 'mediainfo_entity',
			'pp_value' => $entityId->getLocalPart(),
		];
	}

}
