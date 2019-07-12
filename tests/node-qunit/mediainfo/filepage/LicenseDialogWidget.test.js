var sinon = require( 'sinon' ),
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' ),
	pathToWidget = '../../../../resources/filepage/LicenseDialogWidget.js',
	LicenseDialogWidget;

QUnit.module( 'LicenseDialogWidget', hooks.mediainfo, function () {
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
