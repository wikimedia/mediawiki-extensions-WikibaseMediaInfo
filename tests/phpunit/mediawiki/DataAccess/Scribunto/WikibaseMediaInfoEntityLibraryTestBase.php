<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\DataAccess\Scribunto;

use Wikibase\Client\Tests\Integration\DataAccess\Scribunto\WikibaseLibraryTestCase;

/**
 * @covers \Wikibase\MediaInfo\DataAccess\Scribunto\WikibaseMediaInfoEntityLibrary
 */
abstract class WikibaseMediaInfoEntityLibraryTestBase extends WikibaseLibraryTestCase {

	/** @inheritDoc */
	protected static $moduleName = 'WikibaseMediaInfoEntityLibraryTests';

	/** @inheritDoc */
	protected function getTestModules() {
		return parent::getTestModules() + [
			'WikibaseMediaInfoEntityLibraryTests' => __DIR__ . '/WikibaseMediaInfoEntityLibraryTests.lua',
		];
	}

}
