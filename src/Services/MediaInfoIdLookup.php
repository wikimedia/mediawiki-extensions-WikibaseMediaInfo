<?php

namespace Wikibase\MediaInfo\Services;

use InvalidArgumentException;
use Title;
use UnexpectedValueException;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\Lib\Store\EntityIdLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikimedia\Assert\Assert;

/**
 * Lookup service for getting the MediaInfoId that corresponds to a Title.
 *
 * @license GPL-2.0-or-later
 * @author Daniel Kinzler
 */
class MediaInfoIdLookup implements EntityIdLookup {

	/**
	 * @var EntityIdComposer
	 */
	private $entityIdComposer;

	/**
	 * @var int
	 */
	private $mediaInfoNamespace;

	/**
	 * @param EntityIdComposer $entityIdComposer
	 * @param int $mediaInfoNamespace numeric namespace ID of the namespace in which MediaInfo
	 * entities reside.
	 */
	public function __construct( EntityIdComposer $entityIdComposer, $mediaInfoNamespace ) {
		Assert::parameterType( 'integer', $mediaInfoNamespace, '$mediaInfoNamespace' );
		Assert::parameter( $mediaInfoNamespace >= 0, '$mediaInfoNamespace', 'Must not be negative' );

		$this->entityIdComposer = $entityIdComposer;
		$this->mediaInfoNamespace = $mediaInfoNamespace;
	}

	public function getEntityIds( array $titles ) {
		$results = [];
		foreach ( $titles as $title ) {
			$results[$title->getArticleID()] = $this->getEntityIdForTitle( $title );
		}
		return array_filter( $results );
	}

	public function getEntityIdForTitle( Title $title ) {
		if ( !$title->inNamespace( $this->mediaInfoNamespace ) ) {
			return null;
		}

		// The ID for a MediaInfo item is the same as the ID of its associated File page, with
		// an 'M' prepended - this is encapsulated by EntityIdComposer::composeEntityId()
		try {
			return $this->entityIdComposer->composeEntityId(
				'',
				MediaInfo::ENTITY_TYPE,
				$title->getArticleID()
			);
		} catch ( InvalidArgumentException | UnexpectedValueException $e ) {
			return null;
		}
	}

}
