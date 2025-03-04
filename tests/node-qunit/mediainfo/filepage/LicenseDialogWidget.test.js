'use strict';

const sinon = require( 'sinon' ),
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' ),
	pathToWidget = '../../../../resources/filepage/LicenseDialogWidget.js';
let LicenseDialogWidget;

QUnit.module( 'LicenseDialogWidget', hooks.mediainfo, () => {
	QUnit.test( 'constructor', ( assert ) => {
		LicenseDialogWidget = require( pathToWidget );
		/* eslint-disable-next-line no-new */
		new LicenseDialogWidget();
		assert.ok( true );
	} );

	QUnit.module( 'User is not logged in and has not accepted license', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser();
		}
	}, () => {
		QUnit.test( 'getLicenseConfirmation returns zero', ( assert ) => {
			LicenseDialogWidget = require( pathToWidget );
			const dialog = new LicenseDialogWidget();
			assert.strictEqual( dialog.getLicenseConfirmation(), 0 );
		} );

		QUnit.test( 'storeLicenseConfirmation sets value of the appropriate key to 1', ( assert ) => {
			LicenseDialogWidget = require( pathToWidget );
			const dialog = new LicenseDialogWidget();
			dialog.storeLicenseConfirmation();
			assert.strictEqual( global.mw.storage.set.calledWith( dialog.prefKey, 1 ), true );
		} );
	} );

	QUnit.module( 'User is logged in and has not accepted license', {
		beforeEach: function () {
			global.mw.user = helpers.createMediaWikiUser( true );
			global.mw.Api = function () {};
			global.mw.Api.prototype = {
				saveOption: sinon.stub()
			};
		}
	}, () => {
		QUnit.test( 'getLicenseConfirmation returns zero', ( assert ) => {
			// fake out user pref value: license not yet accepted
			global.mw.user.options.get.returns( 0 );

			LicenseDialogWidget = require( pathToWidget );
			const dialog = new LicenseDialogWidget();
			assert.strictEqual( dialog.getLicenseConfirmation(), 0 );
		} );

		QUnit.test( 'storeLicenseConfirmation saves to user preferences', ( assert ) => {
			LicenseDialogWidget = require( pathToWidget );
			const dialog = new LicenseDialogWidget();
			dialog.storeLicenseConfirmation();
			assert.strictEqual( mw.Api.prototype.saveOption.calledWith( dialog.prefKey, 1 ), true );
		} );
	} );
} );
