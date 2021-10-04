<?php

namespace Wikibase\MediaInfo\Content;

use Hooks;
use InvalidArgumentException;
use LogicException;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\Content\EntityContent;
use Wikibase\Repo\Content\EntityHolder;
use Wikibase\Repo\FingerprintSearchTextGenerator;

/**
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoContent extends EntityContent {

	public const CONTENT_MODEL_ID = 'wikibase-mediainfo';

	/**
	 * @var EntityHolder|null
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
	 * @param EntityHolder|null $mediaInfoHolder
	 * @throws InvalidArgumentException
	 */
	public function __construct( EntityHolder $mediaInfoHolder = null ) {
		parent::__construct( self::CONTENT_MODEL_ID );

		if ( $mediaInfoHolder !== null
			&& $mediaInfoHolder->getEntityType() !== MediaInfo::ENTITY_TYPE
		) {
			throw new InvalidArgumentException( '$mediaInfoHolder must contain a MediaInfo entity' );
		}

		$this->mediaInfoHolder = $mediaInfoHolder;
	}

	/**
	 * Constructs an empty content object.
	 *
	 * @return MediaInfoContent
	 */
	public static function emptyContent(): MediaInfoContent {
		return new self( new class() implements EntityHolder {

			public function getEntity( $expectedClass = MediaInfo::class ) {
				return new MediaInfo();
			}

			public function getEntityId() {
				return null;
			}

			public function getEntityType() {
				return MediaInfo::ENTITY_TYPE;
			}

		} );
	}

	protected function getIgnoreKeysForFilters() {
		// We explicitly want to allow the 'labels' block's 'language' keys through, so that AbuseFilters
		// can be written that check if e.g. Latin characters are written in a zh-hans label slot.
		return [
			// pageid, ns, title, lastrevid, & modified are injected in the API but not AF, so don't list
			// MediaInfo entities don't have a "site" attribute, so this shouldn't show up, but for safety
			'site',
			// MediaInfo is not going to use descriptions but they currently appear in the
			// serialization. These should not be checked for filter text.
			'descriptions',
			// Probably won't be used, could be added back if requested
			'rank',
			// Options: value, somevalue, novalue
			'snaktype',
			// Probably pointless in filter text
			'hash',
			// Statement guid
			'id',
			// Hits a few different things
			'type',
			// Hits a few different things
			'datatype',
		];
	}

	/**
	 * @return MediaInfo
	 */
	public function getMediaInfo() {
		if ( !$this->mediaInfoHolder ) {
			throw new LogicException( 'This content object is empty!' );
		}

		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType
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
	 * @return EntityHolder|null
	 */
	public function getEntityHolder() {
		return $this->mediaInfoHolder;
	}

	/**
	 * @see EntityContent::getTextForSearchIndex
	 *
	 * @return string
	 * @throws \FatalError
	 * @throws \MWException
	 */
	public function getTextForSearchIndex() {
		if ( $this->isRedirect() ) {
			return '';
		}

		$searchTextGenerator = new FingerprintSearchTextGenerator();
		$text = $searchTextGenerator->generate( $this->getMediaInfo() );

		if ( !Hooks::run( 'WikibaseTextForSearchIndex', [ $this, &$text ] ) ) {
			return '';
		}

		return $text;
	}

}
