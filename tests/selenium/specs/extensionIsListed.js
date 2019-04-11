var assert = require( 'assert' ),
	VersionPage = require( '../pageobjects/version.page' );

describe( 'Special:Version', function () {
	it.skip( 'has WikibaseMediaInfo listed', function () {
		VersionPage.open();
		assert( VersionPage.extension.waitForVisible() );
	} );
} );
