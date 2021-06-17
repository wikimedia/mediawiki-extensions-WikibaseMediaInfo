<?php

declare( strict_types=1 );

namespace Wikibase\MediaInfo\Rdf;

use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\Repo\Rdf\EntityRdfBuilder;
use Wikibase\Repo\Rdf\FullStatementRdfBuilder;
use Wikibase\Repo\Rdf\FullStatementRdfBuilderFactory;
use Wikibase\Repo\Rdf\RdfProducer;
use Wikibase\Repo\Rdf\TermsRdfBuilder;
use Wikibase\Repo\Rdf\TruthyStatementRdfBuilder;
use Wikibase\Repo\Rdf\TruthyStatementRdfBuilderFactory;

/**
 * @license GPL-2.0-or-later
 */
class MediaInfoRdfBuilder implements EntityRdfBuilder {

	/**
	 * @var TruthyStatementRdfBuilder
	 */
	private $truthyStatementRdfBuilder;

	/**
	 * @var TermsRdfBuilder
	 */
	private $termsRdfBuilder;

	/**
	 * @var FullStatementRdfBuilder
	 */
	private $fullStatementRdfBuilder;

	/**
	 * @var MediaInfoSpecificComponentsRdfBuilder
	 */
	private $mediaInfoSpecificComponentsRdfBuilder;

	public function __construct(
		int $flavorFlags,
		TermsRdfBuilder $termsRdfBuilder,
		TruthyStatementRdfBuilderFactory $truthyStatementRdfBuilderFactory,
		FullStatementRdfBuilderFactory $fullStatementRdfBuilderFactory,
		MediaInfoSpecificComponentsRdfBuilder $mediaInfoSpecificComponentsRdfBuilder
	) {
		if ( $flavorFlags & RdfProducer::PRODUCE_TRUTHY_STATEMENTS ) {
			$this->truthyStatementRdfBuilder = $truthyStatementRdfBuilderFactory->getTruthyStatementRdfBuilder(
				$flavorFlags
			);
		}

		if ( $flavorFlags & RdfProducer::PRODUCE_ALL_STATEMENTS ) {
			$fullStatementRdfBuilder = $fullStatementRdfBuilderFactory->getFullStatementRdfBuilder(
				$flavorFlags
			);
			$this->fullStatementRdfBuilder = $fullStatementRdfBuilder;
		}

		$this->termsRdfBuilder = $termsRdfBuilder;
		$this->mediaInfoSpecificComponentsRdfBuilder = $mediaInfoSpecificComponentsRdfBuilder;
	}

	public function addEntity( EntityDocument $entity ) {
		if ( $this->truthyStatementRdfBuilder ) {
			$this->truthyStatementRdfBuilder->addEntity( $entity );
		}

		if ( $this->fullStatementRdfBuilder ) {
			$this->fullStatementRdfBuilder->addEntity( $entity );
		}

		$this->termsRdfBuilder->addEntity( $entity );
		$this->mediaInfoSpecificComponentsRdfBuilder->addEntity( $entity );
	}

	/**
	 * Map some aspect of an Entity to the RDF graph, as it should appear in the stub
	 * representation of an entity.
	 * @param EntityDocument $entity the entity to output.
	 */
	public function addEntityStub( EntityDocument $entity ) {
		// TODO: remove this method once it's no longer part of EntityRdfBuilder
	}
}
