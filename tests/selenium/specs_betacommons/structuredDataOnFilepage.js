var assert = require( 'assert' ),
	LoginPage = require( '../pageobjects/login.page' ),
	FilePage = require( '../pageobjects/file.page' );

describe( 'File page', function () {
	it( 'captions panel is visible by default', function () {
		FilePage.open();
		assert( FilePage.captionsPanel.waitForVisible() );
	} );

	it( 'statements panel is visible when tab is clicked', function () {
		FilePage.open();
		FilePage.captionsPanel.waitForVisible();
		browser.pause( 3000 );

		FilePage.clickStatementsTab();
		assert( FilePage.statementsPanel.waitForVisible() );
	} );

	it( 'logged-in user can edit captions', function () {
		const captionText = 'Test caption ' + Math.random().toString().substring( 2 );

		LoginPage.loginUser();
		browser.pause( 4000 );

		FilePage.open();
		FilePage.captionsPanel.waitForVisible();
		browser.pause( 4000 );

		FilePage.editCaption( captionText );

		browser.pause( 4000 );
		assert.strictEqual( FilePage.captionsPanel.getText().includes( captionText ), true );
	} );
} );
