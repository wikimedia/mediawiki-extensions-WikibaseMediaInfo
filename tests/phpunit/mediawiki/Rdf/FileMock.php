<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Rdf;

use File;

/**
 * Simple mock for File MediaWiki class.
 *
 * @license GPL-2.0-or-later
 */
class FileMock extends File {

	/**
	 * @var string
	 */
	private $mediaType;

	/**
	 * @var string
	 */
	private $mimeType;

	/**
	 * Simple File mock for RDF generation tests
	 *
	 * @param string $title
	 * @param string $mimeType
	 */
	public function __construct( $title, $mediaType, $mimeType ) {
		parent::__construct( $title, false );

		$this->mediaType = $mediaType;
		$this->mimeType = $mimeType;
	}

	public function getMediaType() {
		return $this->mediaType;
	}

	public function getMimeType() {
		return $this->mimeType;
	}

}
