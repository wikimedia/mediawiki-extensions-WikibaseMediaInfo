'use strict';

var LicenseDialogWidget;

/**
 * @constructor
 */
LicenseDialogWidget = function () {
	this.dialog = new OO.ui.MessageDialog();
	this.windowManager = new OO.ui.WindowManager();
	this.windowManager.addWindows( [ this.dialog ] );
	this.prefKey = 'wbmi-cc0-confirmed';

	// eslint-disable-next-line no-jquery/no-global-selector
	$( 'body' ).append( this.windowManager.$element );
};
OO.inheritClass( LicenseDialogWidget, OO.ui.Widget );

/**
 * Returns a promise that will resolve once the window has been closed.
 *
 * @return {jQuery.Promise}
 */
LicenseDialogWidget.prototype.getConfirmationIfNecessary = function () {
	var self = this,
		deferred = $.Deferred(),
		confirmed = this.getLicenseConfirmation();

	// check if we've agreed to this before, either in present
	// implementation or in previous cookie-based version
	if ( confirmed === 1 ) {
		return deferred.resolve().promise();
	} else if ( mw.cookie.get( 'wbmi-license-cc0' ) === 1 ) {
		this.storeLicenseConfirmation();
		return deferred.resolve().promise();
	}

	this.openDialog();
	this.dialog.getManager().on( 'closing', function ( window, compatClosing, data ) {
		if ( data && data.action === 'accept' ) {
			deferred.resolve();
			self.storeLicenseConfirmation();
		} else {
			// dialog dismissed, e.g. by pressing ESC key
			deferred.reject();
		}
		self.dialog.getManager().off( 'closing' );
	} );

	return deferred.promise();
};

LicenseDialogWidget.prototype.openDialog = function () {
	this.windowManager.openWindow( this.dialog, {
		title: mw.msg( 'wikibasemediainfo-filepage-license-title' ),
		message: $( '<div>' ).append(
			$( '<p>' ).msg( 'wikibasemediainfo-filepage-license-content' ),
			$( '<p>' ).msg( 'wikibasemediainfo-filepage-license-content-acceptance' )
		),
		actions: [
			{
				action: 'accept',
				label: mw.msg( 'wikibasemediainfo-filepage-license-agree' ),
				flags: [ 'primary', 'progressive' ]
			}
		]
	} );
};

/**
 * Determines whether or not the user has already accepted the license
 * terms. For anon users, check if the appropriate value has been set in
 * localstorage; for logged-in users, check if the appropriate user pref has
 * been set.
 *
 * @return {number} 0 or 1
 */
LicenseDialogWidget.prototype.getLicenseConfirmation = function () {
	var storage = mw.storage,
		key = this.prefKey,
		user = mw.user;

	if ( user.isAnon() ) {
		return Number( storage.get( key ) ) || 0;
	} else {
		return Number( user.options.get( key ) );
	}
};

/**
 * If the user confirms the license dialogue, store this appropriately:
 * For logged-in users, that means store the confirmation as a hidden user
 * preference. For non-logged-in users, store the confirmation in
 * localstorage.
 */
LicenseDialogWidget.prototype.storeLicenseConfirmation = function () {
	var storage = mw.storage,
		key = this.prefKey,
		user = mw.user;

	if ( user.isAnon() ) {
		storage.set( key, 1 );
	} else {
		new mw.Api().saveOption( key, 1 );
		user.options.set( key, 1 );
	}
};

module.exports = LicenseDialogWidget;
