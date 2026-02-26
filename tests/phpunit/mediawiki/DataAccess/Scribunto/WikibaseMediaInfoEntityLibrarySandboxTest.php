<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\DataAccess\Scribunto;

/**
 * @covers \Wikibase\MediaInfo\DataAccess\Scribunto\WikibaseMediaInfoEntityLibrary
 * @group Lua
 * @group LuaSandbox
 */
class WikibaseMediaInfoEntityLibrarySandboxTest extends WikibaseMediaInfoEntityLibraryTestBase {
	protected function getEngineName(): string {
		return 'LuaSandbox';
	}
}
