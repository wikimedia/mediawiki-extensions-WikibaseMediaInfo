var assert = require( 'assert' ),
	LoginPage = require( '../pageobjects/login.page' ),
	EditPage = require( '../pageobjects/edit.page' ),
	destinationName;

describe( 'Edit page', function () {
	beforeEach( function () {
		destinationName = 'TestPage ' + Math.random().toString().substring( 2 );
		browser.deleteCookie();
	} );

	it( 'Logged-in user can edit', function () {
		const content = 'Foo bar baz quux';

		LoginPage.loginUser();
		browser.pause( 2000 );
		EditPage.edit( destinationName, content );
		browser.pause( 2000 );

		assert.strictEqual( EditPage.heading.getText(), destinationName );
		assert.strictEqual( EditPage.displayedContent.getText(), content );
	} );
} );
