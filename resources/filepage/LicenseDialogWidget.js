( function ( sd ) {

	'use strict';

	/**
	 * @constructor
	 */
	sd.LicenseDialogWidget = function LicenseDialogWidget() {
		this.dialog = new OO.ui.MessageDialog();
		this.windowManager = new OO.ui.WindowManager();
		this.windowManager.addWindows( [ this.dialog ] );
		this.prefKey = 'wbmi-cc0-confirmed';

		// eslint-disable-next-line jquery/no-global-selector
		$( 'body' ).append( this.windowManager.$element );
	};
	OO.inheritClass( sd.LicenseDialogWidget, OO.ui.Widget );

	/**
	 * Returns a promise that will resolve once the window has been closed.
	 *
	 * @return {$.Promise}
	 */
	sd.LicenseDialogWidget.prototype.getConfirmationIfNecessary = function () {
		var deferred = $.Deferred(),
			confirmed = this.getLicenceConfirmation(),
			self = this;

		// check if we've agreed to this before, either in present
		// implementation or in previous cookie-based version
		if ( confirmed === 1 ) {
			return deferred.resolve().promise();
		} else if ( mw.cookie.get( 'wbmi-license-cc0' ) === 1 ) {
			this.storeLicenseConfirmation();
			return deferred.resolve().promise();
		}

		this.openDialog();
		this.dialog.getActions().once( 'click', function ( action ) {
			// no matter what is clicked, we're good to go: the dialog has no
			// concept of rejecting the license - we only want to make sure
			// they've read this message :)
			deferred.resolve();

			if ( action.getAction() === 'accept' ) {
				self.storeLicenseConfirmation();
			}
		} );

		return deferred.promise();
	};

	sd.LicenseDialogWidget.prototype.openDialog = function () {
		this.windowManager.openWindow( this.dialog, {
			title: mw.message( 'wikibasemediainfo-filepage-license-title' ).text(),
			message: $( '<div>' ).append(
				$( '<p>' ).msg( 'wikibasemediainfo-filepage-license-content' ),
				$( '<p>' ).msg( 'wikibasemediainfo-filepage-license-content-acceptance' )
			),
			actions: [
				{
					action: 'cancel',
					label: mw.message( 'wikibasemediainfo-filepage-license-cancel' ).text(),
					flags: [ 'safe', 'back' ]
				},
				{
					action: 'accept',
					label: mw.message( 'wikibasemediainfo-filepage-license-accept' ).text(),
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
	 * @returns {Number} 0 or 1
	 */
	sd.LicenseDialogWidget.prototype.getLicenceConfirmation = function () {
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
	sd.LicenseDialogWidget.prototype.storeLicenseConfirmation = function () {
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

}( mw.mediaInfo.structuredData ) );
