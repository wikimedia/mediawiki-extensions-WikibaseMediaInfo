<?php

namespace Wikibase\MediaInfo\DataModel\Services\Diff;

use InvalidArgumentException;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Services\Diff\EntityDiff;
use Wikibase\DataModel\Services\Diff\EntityPatcherStrategy;
use Wikibase\DataModel\Services\Diff\Internal\FingerprintPatcher;
use Wikibase\DataModel\Services\Diff\Internal\StatementListPatcher;
use Wikibase\DataModel\Term\Fingerprint;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\DataModel\MediaInfo;

/**
 * @since 0.1
 *
 * @license GPL-2.0+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 * @author Thiemo Mättig
 */
class MediaInfoPatcher implements EntityPatcherStrategy {

	/**
	 * @var FingerprintPatcher
	 */
	private $fingerprintPatcher;

	/**
	 * @var StatementListPatcher
	 */
	private $statementListPatcher;

	public function __construct() {
		$this->fingerprintPatcher = new FingerprintPatcher();
		$this->statementListPatcher = new StatementListPatcher();
	}

	/**
	 * @param string $entityType
	 *
	 * @return boolean
	 */
	public function canPatchEntityType( $entityType ) {
		return $entityType === 'mediainfo';
	}

	/**
	 * @param EntityDocument $entity
	 * @param EntityDiff $patch
	 *
	 * @return MediaInfo
	 * @throws InvalidArgumentException
	 */
	public function patchEntity( EntityDocument $entity, EntityDiff $patch ) {
		$this->assertIsMediaInfo( $entity );

		$this->patchMediaInfo( $entity, $patch );
	}

	private function assertIsMediaInfo( EntityDocument $mediaInfo ) {
		if ( !( $mediaInfo instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$mediaInfo must be an instance of MediaInfo' );
		}
	}

	private function patchMediaInfo( MediaInfo $mediaInfo, EntityDiff $patch ) {
		// TODO: Introduce and use TermListPatcher.
		$fingerprint = new Fingerprint(
			$mediaInfo->getLabels(),
			$mediaInfo->getDescriptions()
		);
		$this->fingerprintPatcher->patchFingerprint( $fingerprint, $patch );
		$this->replaceTerms( $mediaInfo->getLabels(), $fingerprint->getLabels() );
		$this->replaceTerms( $mediaInfo->getDescriptions(), $fingerprint->getDescriptions() );

		$statements = $mediaInfo->getStatements();
		$patchedStatements = $this->statementListPatcher->getPatchedStatementList(
			$statements,
			$patch->getClaimsDiff()
		);
		// TODO: Introduce and use StatementListPatcher::patchStatementList.
		foreach ( $statements->toArray() as $statement ) {
			$statements->removeStatementsWithGuid( $statement->getGuid() );
		}
		foreach ( $patchedStatements->toArray() as $statement ) {
			$statements->addStatement( $statement );
		}
	}

	private function replaceTerms( TermList $old, TermList $new ) {
		foreach ( $old as $languageCode => $term ) {
			$old->removeByLanguage( $languageCode );
		}
		foreach ( $new as $term ) {
			$old->setTerm( $term );
		}
	}

}
