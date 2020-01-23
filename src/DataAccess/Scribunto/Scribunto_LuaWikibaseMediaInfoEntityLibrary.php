<?php

namespace Wikibase\MediaInfo\DataAccess\Scribunto;

use Wikibase\Client\DataAccess\Scribunto\Scribunto_LuaWikibaseEntityLibrary;

/**
 * Registers and defines functions to access WikibaseMediaInfo through the Scribunto extension
 */
class Scribunto_LuaWikibaseMediaInfoEntityLibrary extends Scribunto_LuaWikibaseEntityLibrary {

	/**
	 * Register the mw.wikibase.mediainfo.entity.lua library.
	 *
	 * @return array
	 */
	public function register() {
		// These functions will be exposed to the Lua module.
		// They are member functions on a Lua table which is private to the module, thus
		// these can't be called from user code, unless explicitly exposed in Lua.
		$lib = [];

		// @phan-suppress-next-line PhanUndeclaredMethod
		return $this->getEngine()->registerInterface(
			__DIR__ . '/mw.wikibase.mediainfo.entity.lua', $lib, []
		);
	}

}
