<?php

namespace Wikibase\MediaInfo\Content;

use InvalidArgumentException;
use LogicException;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\Content\EntityContent;
use Wikibase\Repo\Content\EntityHolder;
use Wikibase\Repo\FingerprintSearchTextGenerator;
use Wikibase\Repo\Hooks\WikibaseTextForSearchIndexHook;

/**
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoContent extends EntityContent {

	public const CONTENT_MODEL_ID = 'wikibase-mediainfo';

	/**
	 * Do not use to construct new stuff from outside of this class -
	 * prefer MediaInfoHandler::newEntityContent (since I61d9a89e3ef19e10c04dbfdea02d4096cd2b8cda)
	 *
	 * @throws InvalidArgumentException
	 */
	public function __construct(
		private readonly WikibaseTextForSearchIndexHook $hookRunner,
		private readonly ?EntityHolder $mediaInfoHolder = null,
	) {
		parent::__construct( self::CONTENT_MODEL_ID );

		if ( $mediaInfoHolder !== null
			&& $mediaInfoHolder->getEntityType() !== MediaInfo::ENTITY_TYPE
		) {
			throw new InvalidArgumentException( '$mediaInfoHolder must contain a MediaInfo entity' );
		}
	}

	/** @inheritDoc */
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
	 */
	public function getTextForSearchIndex() {
		if ( $this->isRedirect() ) {
			return '';
		}

		$searchTextGenerator = new FingerprintSearchTextGenerator();
		$text = $searchTextGenerator->generate( $this->getMediaInfo() );

		if ( !$this->hookRunner->onWikibaseTextForSearchIndex( $this, $text ) ) {
			return '';
		}

		return $text;
	}

}
