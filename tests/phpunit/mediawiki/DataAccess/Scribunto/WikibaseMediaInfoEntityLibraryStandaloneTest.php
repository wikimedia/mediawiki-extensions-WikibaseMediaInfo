<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\DataAccess\Scribunto;

/**
 * @covers \Wikibase\MediaInfo\DataAccess\Scribunto\WikibaseMediaInfoEntityLibrary
 * @group Lua
 * @group LuaStandalone
 */
class WikibaseMediaInfoEntityLibraryStandaloneTest extends WikibaseMediaInfoEntityLibraryTestBase {
	protected function getEngineName(): string {
		return 'LuaStandalone';
	}
}
