<?php

namespace Wikibase\MediaInfo\Content;

use Hooks;
use InvalidArgumentException;
use Wikibase\Content\EntityHolder;
use Wikibase\DataModel\Term\Fingerprint;
use Wikibase\EntityContent;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\FingerprintSearchTextGenerator;

/**
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoContent extends EntityContent {

	const CONTENT_MODEL_ID = 'wikibase-mediainfo';

	/**
	 * @var EntityHolder
	 */
	private $mediaInfoHolder;

	/**
	 * Do not use to construct new stuff from outside of this class,
	 * use the static newFoobar methods.
	 *
	 * In other words: treat as protected (which it was, but now
	 * cannot be since we derive from Content).
	 *
	 * @protected
	 *
	 * @param EntityHolder $mediaInfoHolder
	 * @throws InvalidArgumentException
	 */
	public function __construct( EntityHolder $mediaInfoHolder ) {
		parent::__construct( self::CONTENT_MODEL_ID );

		if ( $mediaInfoHolder->getEntityType() !== MediaInfo::ENTITY_TYPE ) {
			throw new InvalidArgumentException( '$mediaInfoHolder must contain a MediaInfo entity' );
		}

		$this->mediaInfoHolder = $mediaInfoHolder;
	}

	/**
	 * @return MediaInfo
	 */
	public function getMediaInfo() {
		return $this->mediaInfoHolder->getEntity( MediaInfo::class );
	}

	/**
	 * @see EntityContent::getEntity
	 *
	 * @return MediaInfo
	 */
	public function getEntity() {
		return $this->getMediaInfo();
	}

	/**
	 * @see EntityContent::getEntityHolder
	 *
	 * @return EntityHolder
	 */
	protected function getEntityHolder() {
		return $this->mediaInfoHolder;
	}

	/**
	 * @see EntityContent::isStub
	 *
	 * @return bool
	 */
	public function isStub() {
		return !$this->isRedirect()
		       && !$this->getMediaInfo()->isEmpty()
		       && $this->getMediaInfo()->getStatements()->isEmpty();
	}

	/**
	 * @see EntityContent::isCountable
	 *
	 * @param bool|null $hasLinks
	 *
	 * @return bool
	 */
	public function isCountable( $hasLinks = null ) {
		return !$this->isRedirect() && !$this->getMediaInfo()->isEmpty();
	}

	/**
	 * @see EntityContent::getTextForSearchIndex
	 *
	 * @return string
	 */
	public function getTextForSearchIndex() {
		if ( $this->isRedirect() ) {
			return '';
		}

		$mediaInfo = $this->getMediaInfo();
		$fingerprint = new Fingerprint( $mediaInfo->getLabels(), $mediaInfo->getDescriptions() );

		$searchTextGenerator = new FingerprintSearchTextGenerator();
		$text = $searchTextGenerator->generate( $fingerprint );

		if ( !Hooks::run( 'WikibaseTextForSearchIndex', [ $this, &$text ] ) ) {
			return '';
		}

		return $text;
	}

}
