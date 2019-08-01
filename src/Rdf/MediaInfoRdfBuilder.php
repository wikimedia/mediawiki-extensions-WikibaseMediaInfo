<?php

namespace Wikibase\MediaInfo\Rdf;

use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
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

	public function __construct( RdfVocabulary $vocabulary, RdfWriter $writer ) {
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

		$this->addTypes( $entity->getId() );
	}

	/**
	 * Produce MediaInfo types
	 * @param MediaInfoId $id
	 */
	private function addTypes( MediaInfoId $id ) {
		$mediaLName = $this->vocabulary->getEntityLName( $id );

		$mediaRepository = $this->vocabulary->getEntityRepositoryName( $id );

		$this->writer->about( $this->vocabulary->entityNamespaceNames[$mediaRepository], $mediaLName )
			->a( RdfVocabulary::NS_SCHEMA_ORG, 'MediaObject' );
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
