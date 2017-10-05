<?php

namespace Wikibase\MediaInfo\Maintenance;

use BatchRowIterator;
use BatchRowUpdate;
use LoggedUpdateMaintenance;
use Wikibase\MediaInfo\Maintenance\Util\PagePropsUpdateWriter;
use Wikibase\MediaInfo\Maintenance\Util\PagePropsUpdateGenerator;
use Wikibase\Repo\WikibaseRepo;

$basePath = getenv( 'MW_INSTALL_PATH' ) !== false
	? getenv( 'MW_INSTALL_PATH' )
	: __DIR__ . '/../../..';

require_once $basePath . '/maintenance/Maintenance.php';

/**
 * Maintenance script for populating page_props mediainfo_entity for existing media files.
 *
 * @license GPL-2.0+
 */
class CreatePageProps extends LoggedUpdateMaintenance {

	public function __construct() {
		parent::__construct();

		$this->addDescription( 'Populates page_props mediainfo_entity for existing media files' );

		$this->setBatchSize( 300 );
	}

	/**
	 * @inheritDoc
	 */
	protected function getUpdateKey() {
		return 'WikibaseMediaInfoCreatePageProps';
	}

	/**
	 * @inheritDoc
	 */
	public function doDBUpdates() {
		$dbr = wfGetDB( DB_REPLICA );
		$dbw = wfGetDB( DB_MASTER );
		$entityIdComposer = WikibaseRepo::getDefaultInstance()->getEntityIdComposer();

		// find all pages in NS_FILE that don't have a page_props.pp_propname='mediainfo_entity' yet
		$iterator = new BatchRowIterator(
			$dbr,
			[ 'page', 'page_props' ],
			'page_id',
			$this->mBatchSize
		);
		$iterator->setFetchColumns( [ 'page_id' ] );
		$iterator->addConditions( [
			'page_namespace' => NS_FILE,
			'pp_propname' => null,
		] );
		$iterator->addJoinConditions( [
			'page_props' => [
				'LEFT JOIN',
				[
					'pp_page = page_id',
					'pp_propname' => 'mediainfo_entity',
				]
			]
		] );

		$updater = new BatchRowUpdate(
			$iterator,
			new PagePropsUpdateWriter( $dbw, 'page_props' ),
			new PagePropsUpdateGenerator( $entityIdComposer )
		);
		$updater->execute();

		return true;
	}

}

$maintClass = CreatePageProps::class;
require_once RUN_MAINTENANCE_IF_MAIN;
