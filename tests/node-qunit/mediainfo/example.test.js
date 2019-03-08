var jsdom = require( 'jsdom' ),
	sinon = require( 'sinon' ),
	helpers = require( '../helpers.js' ),
	LicenseDialogWidget,
	sandbox,
	dom;

QUnit.module( 'LicenseDialogWidget', {
	beforeEach: function () {
		sandbox = sinon.createSandbox();
		dom = new jsdom.JSDOM( '<!doctype html><html><body></body></html>' );
		global.window = dom.window;
		global.document = global.window.document;
		global.jQuery = global.$ = window.jQuery = window.$ = require( 'jquery' );
		global.OO = require( 'oojs' );
		global.OO.ui = require( '../ooui.js' );
		global.mw = helpers.createMediaWikiEnv();
	},

	afterEach: function () {
		sandbox.reset();
	}
}, function () {
	QUnit.test( 'constructor', function ( assert ) {
		LicenseDialogWidget = require( '../../../resources/filepage/LicenseDialogWidget.js' );
		new LicenseDialogWidget();
		assert.ok( true );
	} );

	QUnit.module( 'User is not logged in and has not accepted license', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser();
			global.mw.storage = helpers.createMockStorage();
		}
	}, function () {
		QUnit.test( 'getLicenseConfirmation returns zero', function ( assert ) {
			LicenseDialogWidget = require( '../../../resources/filepage/LicenseDialogWidget.js' );
			var dialog = new LicenseDialogWidget();
			assert.strictEqual( dialog.getLicenseConfirmation(), 0 );
		} );

		QUnit.test( 'storeLicenseConfirmation sets value of the appropriate key to 1', function ( assert ) {
			LicenseDialogWidget = require( '../../../resources/filepage/LicenseDialogWidget.js' );
			var dialog = new LicenseDialogWidget();
			dialog.storeLicenseConfirmation();
			assert.strictEqual( global.mw.storage.set.calledWith( dialog.prefKey, 1 ), true );
		} );
	} );

	QUnit.module( 'User is not logged in and has accepted license', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser( {
				loggedIn: true,
				licenseAccepted: false
			} );
			global.mw.storage = helpers.createMockStorage();
			global.mw.Api = function () {};
			global.mw.Api.prototype = {
				saveOption: sinon.stub()
			};
		}
	}, function () {
		QUnit.test( 'getLicenseConfirmation returns zero', function ( assert ) {
			LicenseDialogWidget = require( '../../../resources/filepage/LicenseDialogWidget.js' );
			var dialog = new LicenseDialogWidget();
			assert.strictEqual( dialog.getLicenseConfirmation(), 0 );
		} );

		QUnit.test( 'storeLicenseConfirmation saves to user preferences', function ( assert ) {
			LicenseDialogWidget = require( '../../../resources/filepage/LicenseDialogWidget.js' );
			var dialog = new LicenseDialogWidget();

			dialog.storeLicenseConfirmation();
			assert.strictEqual( mw.Api.prototype.saveOption.calledWith( dialog.prefKey, 1 ), true );
		} );
	} );
} );
