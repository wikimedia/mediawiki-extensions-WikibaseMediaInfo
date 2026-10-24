<?php
/**
 * Imports properties and items from Wikidata into the local Wikibase
 * repository, for local development of structured data on files.
 *
 * @file
 * @ingroup Maintenance
 */

// @codeCoverageIgnoreStart
$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";
// @codeCoverageIgnoreEnd

use MediaWiki\Context\RequestContext;
use MediaWiki\Json\FormatJson;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\User\User;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\Repo\WikibaseRepo;

/**
 * Maintenance script to import properties and items from Wikidata into the
 * local Wikibase repository, keeping their IDs, so that configuration and
 * statements using Wikidata IDs work locally like on Wikimedia Commons
 *
 * Only the terms (labels, descriptions and aliases) in the given languages and
 * the data types of properties are imported: statements and sitelinks would
 * refer to entities which don't exist locally, and all languages would exceed
 * the maximum entity size of DevelopmentSettings.php.
 *
 * @ingroup Maintenance
 */
class ImportWikidataEntities extends Maintenance {

	private const API_URL = 'https://www.wikidata.org/w/api.php';

	/** Maximum number of IDs per wbgetentities request */
	private const BATCH_SIZE = 50;

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikibaseMediaInfo' );
		$this->addDescription(
			'Import the properties of $wgMediaInfoProperties and further properties and items ' .
			'from Wikidata into the local Wikibase repository'
		);
		$this->addOption(
			'ids',
			'Comma-separated IDs of further entities to import, e.g. properties and items used by ' .
			'other extensions, or items to use as statement values',
			false,
			true
		);
		$this->addOption(
			'languages',
			'Comma-separated languages of the terms to import (default: mul, en and the content language)',
			false,
			true
		);
	}

	public function execute() {
		$ids = array_unique( array_merge(
			array_values( $this->getConfig()->get( 'MediaInfoProperties' ) ),
			array_filter( array_map( 'trim', explode( ',', $this->getOption( 'ids', '' ) ) ) )
		) );
		if ( !$ids ) {
			$this->fatalError( 'Nothing to import: set $wgMediaInfoProperties or pass --ids.' );
		}

		$user = User::newSystemUser( User::MAINTENANCE_SCRIPT_USER, [ 'steal' => true ] );
		$context = RequestContext::getMain();
		$context->setUser( $user );

		$languages = $this->hasOption( 'languages' )
			? array_map( 'trim', explode( ',', $this->getOption( 'languages' ) ) )
			: array_unique( [ 'mul', 'en', $this->getConfig()->get( 'LanguageCode' ) ] );

		$failed = 0;
		foreach ( array_chunk( $ids, self::BATCH_SIZE ) as $batch ) {
			foreach ( $this->fetchEntities( $batch, $languages ) as $id => $data ) {
				if ( !$this->saveEntity( $id, $data, $context ) ) {
					$failed++;
				}
			}
		}

		if ( $failed ) {
			$this->fatalError( "Failed to import $failed entities." );
		}
		$this->output( "Done.\n" );
	}

	/**
	 * @param string[] $ids
	 * @param string[] $languages
	 * @return array[] Serialized entities by ID
	 */
	private function fetchEntities( array $ids, array $languages ): array {
		$url = wfAppendQuery( self::API_URL, [
			'action' => 'wbgetentities',
			'format' => 'json',
			'ids' => implode( '|', $ids ),
			'props' => 'info|datatype|labels|descriptions|aliases',
			'languages' => implode( '|', $languages ),
		] );
		$response = $this->getServiceContainer()->getHttpRequestFactory()->get( $url, [], __METHOD__ );
		$result = $response === null ? null : FormatJson::decode( $response, true );
		if ( !isset( $result['entities'] ) ) {
			$this->fatalError( "Failed to fetch entities from Wikidata: $url" );
		}

		$entities = [];
		foreach ( $result['entities'] as $id => $data ) {
			if ( isset( $data['missing'] ) ) {
				$this->error( "$id: missing on Wikidata" );
				continue;
			}
			$entities[$id] = array_intersect_key(
				$data,
				array_flip( [ 'type', 'id', 'datatype', 'labels', 'descriptions', 'aliases' ] )
			);
		}
		return $entities;
	}

	private function saveEntity( string $id, array $data, RequestContext $context ): bool {
		$entity = WikibaseRepo::getBaseDataModelDeserializerFactory()
			->newEntityDeserializer()
			->deserialize( $data );
		if ( !$entity instanceof EntityDocument ) {
			$this->error( "$id: invalid entity" );
			return false;
		}

		$exists = WikibaseRepo::getEntityLookup()->hasEntity( $entity->getId() );
		$status = WikibaseRepo::getEditEntityFactory()
			->newEditEntity( $context )
			->attemptSave(
				$entity,
				'Import from Wikidata for local development',
				$exists ? EDIT_UPDATE : EDIT_NEW,
				false
			);
		if ( !$status->isOK() ) {
			$this->error( "$id: failed to save" );
			$this->error( $status );
			return false;
		}

		$this->output( ( $exists ? 'Updated' : 'Imported' ) . " $id\n" );
		return true;
	}
}

// @codeCoverageIgnoreStart
$maintClass = ImportWikidataEntities::class;
require_once RUN_MAINTENANCE_IF_MAIN;
// @codeCoverageIgnoreEnd
