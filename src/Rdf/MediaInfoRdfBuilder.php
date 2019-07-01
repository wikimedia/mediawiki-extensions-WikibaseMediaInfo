<?php

namespace Wikibase\MediaInfo\Rdf;

use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Rdf\EntityRdfBuilder;
use Wikibase\Rdf\RdfVocabulary;
use Wikimedia\Purtle\RdfWriter;

/**
 * RDF builder for MediaInfo
 */
class MediaInfoRdfBuilder implements EntityRdfBuilder {

	/**
	 * @var RdfVocabulary
	 */
	private $vocabulary;

	/**
	 * @var RdfWriter
	 */
	private $writer;

	public function __construct(
		RdfVocabulary $vocabulary,
		RdfWriter $writer
	) {
		$this->vocabulary = $vocabulary;
		$this->writer = $writer;
	}

	/**
	 * Map some aspect of an Entity to the RDF graph.
	 *
	 * @param EntityDocument $entity the entity to output.
	 */
	public function addEntity( EntityDocument $entity ) {
		if ( !$entity instanceof MediaInfo ) {
			return;
		}
		$mediaLName = $this->vocabulary->getEntityLName( $entity->getId() );

		$this->addTypes( $mediaLName );
		$this->addCaptions( $mediaLName, $entity );
	}

	/**
	 * Produce MediaInfo types
	 */
	private function addTypes( $mediaLName ) {
		$this->writer->about( RdfVocabulary::NS_ENTITY, $mediaLName )
			->a( RdfVocabulary::NS_SCHEMA_ORG, 'MediaObject' );
	}

	/**
	 * Add schema:caption
	 * @param string $mediaLName
	 * @param MediaInfo $entity
	 */
	private function addCaptions( $mediaLName, MediaInfo $entity ) {
		$labels = $entity->getLabels()->toTextArray();
		if ( $labels ) {
			$this->writer->about( RdfVocabulary::NS_ENTITY, $mediaLName )
				->say( RdfVocabulary::NS_SCHEMA_ORG, 'caption' );
			foreach ( $entity->getLabels()->toTextArray() as $languageCode => $labelText ) {
				$this->writer->text( $labelText, $languageCode );
			}
		}
	}

	/**
	 * Map some aspect of an Entity to the RDF graph, as it should appear in the stub
	 * representation of an entity.
	 *
	 * The implementation of this method will often be empty, since most aspects of an entity
	 * should not be included in the stub representation. Typically, the stub only contains
	 * basic type information and labels, for use by RDF modelling tools.
	 *
	 * @param EntityDocument $entity the entity to output.
	 */
	public function addEntityStub( EntityDocument $entity ) {
	}

}
