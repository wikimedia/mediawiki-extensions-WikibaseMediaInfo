<?php

namespace Wikibase\MediaInfo\Tests\Integration;

use Hooks;
use PHPUnit_Framework_TestCase;

/**
 * @covers Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends PHPUnit_Framework_TestCase {

	public function testOnUnitTestsList() {
		$paths = [];

		Hooks::run( 'UnitTestsList', [ &$paths ] );

		$paths = array_map( 'realpath', $paths );
		$expected = realpath( __DIR__ . '/../' );

		$this->assertContains( $expected, $paths );
	}

}
