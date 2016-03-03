<?php

namespace Wikibase\MediaInfo\Tests;

use PHPUnit_Framework_TestCase;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;

/**
 * @covers Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends PHPUnit_Framework_TestCase {

	public function testOnUnitTestsList() {
		$paths = [ 'foo' ];
		WikibaseMediaInfoHooks::onUnitTestsList( $paths );

		$this->assertEquals( 'foo', $paths[0] );
		$this->assertEquals( realpath( __DIR__ . '/../' ), realpath( $paths[1] ) );
	}

}
