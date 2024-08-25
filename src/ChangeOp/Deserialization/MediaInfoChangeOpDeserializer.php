<?php

namespace Wikibase\MediaInfo\ChangeOp\Deserialization;

use Wikibase\Repo\ChangeOp\ChangeOp;
use Wikibase\Repo\ChangeOp\ChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\ChangeOps;
use Wikibase\Repo\ChangeOp\Deserialization\ChangeOpDeserializationException;
use Wikibase\Repo\ChangeOp\Deserialization\ClaimsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\DescriptionsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\LabelsChangeOpDeserializer;

/**
 * Constructs ChangeOp objects for MediaInfo change requests
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoChangeOpDeserializer implements ChangeOpDeserializer {

	private LabelsChangeOpDeserializer $labelsChangeOpDeserializer;
	private DescriptionsChangeOpDeserializer $descriptionsChangeOpDeserializer;
	private ClaimsChangeOpDeserializer $claimsChangeOpDeserializer;

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
