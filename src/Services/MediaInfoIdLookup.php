<?php

namespace Wikibase\MediaInfo\Services;

use InvalidArgumentException;
use MediaWiki\Linker\LinkTarget;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikimedia\Assert\Assert;

/**
 * Lookup service for getting the MediaInfoId that corresponds to a LinkTarget.
 *
 * @license GPL 2+
 * @author Daniel Kinzler
 */
class MediaInfoIdLookup {

	/**
	 * @var integer
	 */
	private $mediaInfoNamespace;

	/**
	 * MediaInfoIdLookup constructor.
	 *
	 * @param int $mediaInfoNamespace numeric namespace ID of the namespace in which MediaInfo
	 * entities reside.
	 */
	public function __construct( $mediaInfoNamespace ) {
		Assert::parameterType( 'integer', $mediaInfoNamespace, '$mediaInfoNamespace' );
		Assert::parameter( $mediaInfoNamespace >= 0, '$mediaInfoNamespace', 'Must not be negative' );

		$this->mediaInfoNamespace = $mediaInfoNamespace;
	}

	/**
	 * @param LinkTarget $title The page the MediaInfo object would be stored on.
	 *
	 * @return null|MediaInfoId The ID of the MediaInfo object that is (or could be) stored on
	 * the given page, or null if the LinkTarget does not correspond to any MediaInfoId.
	 */
	public function getIdFromLinkTarget( LinkTarget $title ) {
		if ( !$title->inNamespace( $this->mediaInfoNamespace ) ) {
			return null;
		}

		try {
			return new MediaInfoId( $title->getText() );
		} catch ( InvalidArgumentException $ex ) {
			return null;
		}
	}
}
