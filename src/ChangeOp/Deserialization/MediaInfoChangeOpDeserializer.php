<?php

namespace Wikibase\MediaInfo\ChangeOp\Deserialization;

use Wikibase\ChangeOp\ChangeOp;
use Wikibase\ChangeOp\ChangeOps;
use Wikibase\Repo\ChangeOp\ChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\ChangeOpDeserializationException;
use Wikibase\Repo\ChangeOp\Deserialization\ClaimsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\DescriptionsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\LabelsChangeOpDeserializer;

/**
 * Constructs ChangeOp objects for MediaInfo change requests
 *
 * @license GPL-2.0+
 */
class MediaInfoChangeOpDeserializer implements ChangeOpDeserializer {

	private $labelsChangeOpDeserializer;

	private $descriptionsChangeOpDeserializer;

	private $claimsChangeOpDeserializer;

	public function __construct(
		LabelsChangeOpDeserializer $labelsChangeOpDeserializer,
		DescriptionsChangeOpDeserializer $descriptionsChangeOpDeserializer,
		ClaimsChangeOpDeserializer $claimsChangeOpDeserializer
	) {
		$this->labelsChangeOpDeserializer = $labelsChangeOpDeserializer;
		$this->descriptionsChangeOpDeserializer = $descriptionsChangeOpDeserializer;
		$this->claimsChangeOpDeserializer = $claimsChangeOpDeserializer;
	}

	/**
	 * @see ChangeOpDeserializer::createEntityChangeOp
	 *
	 * @param array[] $changeRequest
	 *
	 * @return ChangeOp
	 * @throws ChangeOpDeserializationException
	 */
	public function createEntityChangeOp( array $changeRequest ) {
		if ( array_key_exists( 'aliases', $changeRequest )
			|| array_key_exists( 'sitelinks', $changeRequest )
		) {
			throw new ChangeOpDeserializationException(
				'MediaInfo cannot have aliases or sitelinks',
				'not-supported'
			);
		}

		$changeOps = new ChangeOps();

		if ( array_key_exists( 'labels', $changeRequest ) ) {
			$changeOps->add(
				$this->labelsChangeOpDeserializer->createEntityChangeOp( $changeRequest )
			);
		}

		if ( array_key_exists( 'descriptions', $changeRequest ) ) {
			$changeOps->add(
				$this->descriptionsChangeOpDeserializer->createEntityChangeOp( $changeRequest )
			);
		}

		if ( array_key_exists( 'claims', $changeRequest ) ) {
			$changeOps->add(
				$this->claimsChangeOpDeserializer->createEntityChangeOp( $changeRequest )
			);
		}

		return $changeOps;
	}

}
