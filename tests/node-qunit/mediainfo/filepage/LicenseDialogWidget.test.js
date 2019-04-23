var jsdom = require( 'jsdom' ),
	sinon = require( 'sinon' ),
	helpers = require( '../../support/helpers.js' ),
	LicenseDialogWidget,
	pathToWidget,
	sandbox,
	dom;

pathToWidget = '../../../../resources/filepage/LicenseDialogWidget.js';

QUnit.module( 'LicenseDialogWidget', {
	beforeEach: function () {
		sandbox = sinon.createSandbox();
		dom = new jsdom.JSDOM( '<!doctype html><html><body></body></html>' );
		global.window = dom.window;
		global.document = global.window.document;
		global.jQuery = global.$ = window.jQuery = window.$ = require( 'jquery' );
		global.OO = require( 'oojs' );

		// Both OOUI and the WMF theme need to be loaded into scope via require();
		// properties are automatically added to OO namespace.
		require( 'oojs-ui' );
		require( 'oojs-ui/dist/oojs-ui-wikimediaui.js' );

		global.mw = helpers.createMediaWikiEnv();
	},

	afterEach: function () {
		delete require.cache[ require.resolve( 'jquery' ) ];
		sandbox.reset();
	}
}, function () {
	QUnit.test( 'constructor', function ( assert ) {
		LicenseDialogWidget = require( pathToWidget );
		/* eslint-disable-next-line no-new */
		new LicenseDialogWidget();
		assert.ok( true );
	} );

	QUnit.module( 'User is not logged in and has not accepted license', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser();
		}
	}, function () {
		QUnit.test( 'getLicenseConfirmation returns zero', function ( assert ) {
			var dialog;

			LicenseDialogWidget = require( pathToWidget );
			dialog = new LicenseDialogWidget();
			assert.strictEqual( dialog.getLicenseConfirmation(), 0 );
		} );

		QUnit.test( 'storeLicenseConfirmation sets value of the appropriate key to 1', function ( assert ) {
			var dialog;

			LicenseDialogWidget = require( pathToWidget );
			dialog = new LicenseDialogWidget();
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
			global.mw.Api = function () {};
			global.mw.Api.prototype = {
				saveOption: sinon.stub()
			};
		}
	}, function () {
		QUnit.test( 'getLicenseConfirmation returns zero', function ( assert ) {
			var dialog;

			LicenseDialogWidget = require( pathToWidget );
			dialog = new LicenseDialogWidget();
			assert.strictEqual( dialog.getLicenseConfirmation(), 0 );
		} );

		QUnit.test( 'storeLicenseConfirmation saves to user preferences', function ( assert ) {
			var dialog;

			LicenseDialogWidget = require( pathToWidget );
			dialog = new LicenseDialogWidget();
			dialog.storeLicenseConfirmation();
			assert.strictEqual( mw.Api.prototype.saveOption.calledWith( dialog.prefKey, 1 ), true );
		} );
	} );
} );
