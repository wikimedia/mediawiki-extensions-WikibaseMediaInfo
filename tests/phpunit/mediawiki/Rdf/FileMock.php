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
	 * @var mixed[string]
	 */
	private $params;

	/**
	 * Simple File mock for RDF generation tests
	 *
	 * @param string $title
	 * @param mixed[string] $params
	 */
	public function __construct( $title, array $params ) {
		parent::__construct( $title, false );

		$this->params = $params;
	}

	/** @inheritDoc */
	public function getMediaType() {
		return $this->params['mediaType'] ?? parent::getMediaType();
	}

	/** @inheritDoc */
	public function getMimeType() {
		return $this->params['mimeType'] ?? parent::getMimeType();
	}

	/** @inheritDoc */
	public function getCanonicalUrl() {
		return $this->params['canonicalUrl'] ?? parent::getCanonicalUrl();
	}

	/** @inheritDoc */
	public function getSize() {
		return $this->params['size'] ?? parent::getSize();
	}

	/** @inheritDoc */
	public function getWidth( $page = 1 ) {
		return $this->params['width'] ?? parent::getWidth();
	}

	/** @inheritDoc */
	public function getHeight( $page = 1 ) {
		return $this->params['height'] ?? parent::getHeight();
	}

	/** @inheritDoc */
	public function pageCount() {
		return $this->params['pageCount'] ?? parent::pageCount();
	}

	/** @inheritDoc */
	public function getLength() {
		return $this->params['length'] ?? parent::getLength();
	}

}
