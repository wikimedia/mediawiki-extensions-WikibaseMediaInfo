<?php

namespace Wikibase\MediaInfo\DataAccess\Scribunto;

use Title;
use Wikibase\Client\DataAccess\Scribunto\Scribunto_LuaWikibaseLibrary;
use Wikibase\Lib\Store\EntityIdLookup;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\MediaInfoServices;

/**
 * Registers and defines functions to access WikibaseMediaInfo through the Scribunto extension
 */
class Scribunto_LuaWikibaseMediaInfoLibrary extends Scribunto_LuaWikibaseLibrary {

	/**
	 * @var EntityIdLookup
	 */
	private $entityIdLookup;

	/**
	 * Register mw.wikibase.mediainfo.lua library
	 *
	 * @return array
	 */
	public function register() {
		// These functions will be exposed to the Lua module.
		// They are member functions on a Lua table which is private to the module, thus
		// these can't be called from user code, unless explicitly exposed in Lua.
		$lib = [
			'incrementStatsKey' => [ $this, 'incrementStatsKey' ],
			'getMediaInfoId' => [ $this, 'getMediaInfoId' ],
		];

		// @phan-suppress-next-line PhanUndeclaredMethod
		return $this->getEngine()->registerInterface(
			__DIR__ . '/mw.wikibase.mediainfo.lua', $lib, []
		);
	}

	/**
	 * Alternative for parent's getEntityId, but specific to MediaInfo entities,
	 * for which there is no $globalSiteId-based lookup.
	 *
	 * @param string $pageTitle
	 * @return array
	 */
	public function getMediaInfoId( $pageTitle ) {
		// @phan-suppress-next-line PhanUndeclaredMethod
		$this->checkType( 'getMediaInfoId', 1, $pageTitle, 'string' );

		$title = Title::newFromDBkey( $pageTitle );
		if ( $title === null ) {
			return [ null ];
		}

		$entityId = $this->getEntityIdLookup()->getEntityIdForTitle( $title );
		if ( !$entityId instanceof MediaInfoId ) {
			return [ null ];
		}

		$this->getUsageAccumulator()->addTitleUsage( $entityId );

		return [ $entityId->getSerialization() ];
	}

	/**
	 * @return EntityIdLookup
	 */
	private function getEntityIdLookup() {
		if ( $this->entityIdLookup === null ) {
			$this->entityIdLookup = MediaInfoServices::getMediaInfoIdLookup();
		}

		return $this->entityIdLookup;
	}

}
