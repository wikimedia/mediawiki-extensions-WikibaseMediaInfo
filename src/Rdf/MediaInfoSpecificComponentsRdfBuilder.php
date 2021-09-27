<?php

namespace Wikibase\MediaInfo\Rdf;

use File;
use RepoGroup;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\Repo\Rdf\EntityRdfBuilder;
use Wikibase\Repo\Rdf\RdfVocabulary;
use Wikimedia\Purtle\RdfWriter;

/**
 * RDF builder for MediaInfo
 */
class MediaInfoSpecificComponentsRdfBuilder implements EntityRdfBuilder {

	/**
	 * @var RdfVocabulary
	 */
	private $vocabulary;

	/**
	 * @var RdfWriter
	 */
	private $writer;

	/**
	 * @var MediaInfoHandler
	 */
	private $mediaInfoHandler;

	/**
	 * @var RepoGroup
	 */
	private $repoGroup;

	public function __construct(
		RdfVocabulary $vocabulary,
		RdfWriter $writer,
		MediaInfoHandler $mediaInfoHandler,
		RepoGroup $repoGroup
	) {
		$this->vocabulary = $vocabulary;
		$this->writer = $writer;
		$this->mediaInfoHandler = $mediaInfoHandler;
		$this->repoGroup = $repoGroup;
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
		$this->addFileMetadataFromEntityId( $entity->getId() );
	}

	/**
	 * Start an "about" clause for the given ID in the RDF writer.
	 *
	 * @param MediaInfoId $id
	 * @return RDFWriter for chaining
	 */
	private function aboutId( MediaInfoId $id ): RdfWriter {
		$mediaLName = $this->vocabulary->getEntityLName( $id );

		$mediaRepository = $this->vocabulary->getEntityRepositoryName( $id );

		return $this->writer->about( $this->vocabulary->entityNamespaceNames[$mediaRepository], $mediaLName );
	}

	/**
	 * Produce MediaInfo types
	 * @param MediaInfoId $id
	 */
	private function addTypes( MediaInfoId $id ) {
		$this->aboutId( $id )
			->a( RdfVocabulary::NS_SCHEMA_ORG, 'MediaObject' );
	}

	/**
	 * Add file metadata to RDF representation
	 *
	 * @param MediaInfoId $id
	 */
	private function addFileMetadataFromEntityId( MediaInfoId $id ) {
		$fileTitle = $this->mediaInfoHandler->getTitleForId( $id );
		if ( $fileTitle === null ) {
			return;
		}
		$file = $this->repoGroup->findFile( $fileTitle );
		if ( $file === false ) {
			return;
		}
		$this->addFileMetadataFromFile( $id, $file );
	}

	private function addFileMetadataFromFile( MediaInfoId $id, File $file ) {
		$this->addFileSpecificType( $id, $file );
		$this->addEncodingFormat( $id, $file );
		$this->addFileUrl( $id, $file );
		$this->addFileUrlAlt( $id, $file );

		$this->addPositiveIntegerValue( $id, 'contentSize', $file->getSize() );
		if ( $file->isMultipage() ) {
			$this->addPositiveIntegerValue( $id, 'numberOfPages', $file->pageCount() );
			// Width and height of a file is not always the same for all pages of multi-pages files
		} else {
			$this->addPositiveIntegerValue( $id, 'height', $file->getHeight() );
			$this->addPositiveIntegerValue( $id, 'width', $file->getWidth() );
		}
		$this->addDuration( $id, $file );
	}

	private function addFileSpecificType( MediaInfoId $id, File $file ) {
		$specificType = $this->getFileSpecificType( $file );
		if ( $specificType !== null ) {
			$this->aboutId( $id )
				->a( RdfVocabulary::NS_SCHEMA_ORG, $specificType );
		}
	}

	private function getFileSpecificType( File $file ) {
		switch ( $file->getMediaType() ) {
			case MEDIATYPE_BITMAP:
			case MEDIATYPE_DRAWING:
				return 'ImageObject';
			case MEDIATYPE_AUDIO:
				return 'AudioObject';
			case MEDIATYPE_VIDEO:
				return 'VideoObject';
			default:
				return null;
		}
	}

	private function addEncodingFormat( MediaInfoId $id, File $file ) {
		$this->aboutId( $id )
			->say( RdfVocabulary::NS_SCHEMA_ORG, 'encodingFormat' )
			->value( $file->getMimeType() );
	}

	private function addFileUrl( MediaInfoId $id, File $file ) {
		$this->aboutId( $id )
			->say( RdfVocabulary::NS_SCHEMA_ORG, 'contentUrl' )
			->is( $file->getCanonicalUrl() );
	}

	private function addFileUrlAlt( MediaInfoId $id, File $file ) {
		$url = $this->vocabulary->getMediaFileURI( $file->getTitle()->getText() );

		$this->aboutId( $id )
			->say( RdfVocabulary::NS_SCHEMA_ORG, 'url' )
			->is( $url );
	}

	private function addDuration( MediaInfoId $id, File $file ) {
		$duration = $file->getLength();
		if ( $duration > 0 ) {
			$this->aboutId( $id )
				->say( RdfVocabulary::NS_SCHEMA_ORG, 'duration' )
				->value( 'PT' . $duration . 'S', 'xsd', 'duration' );
		}
	}

	private function addPositiveIntegerValue( MediaInfoId $id, $schemaProperty, $value ) {
		if ( is_int( $value ) && $value > 0 ) {
			$this->aboutId( $id )
				->say( RdfVocabulary::NS_SCHEMA_ORG, $schemaProperty )
				->value( (string)$value, 'xsd', 'integer' );
		}
	}
}
