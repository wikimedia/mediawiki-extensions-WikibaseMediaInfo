( function ( sd ) {

	'use strict';

	/**
	 * @constructor
	 */
	sd.LicenseDialogWidget = function LicenseDialogWidget() {
		this.dialog = new OO.ui.MessageDialog();
		this.windowManager = new OO.ui.WindowManager();
		this.windowManager.addWindows( [ this.dialog ] );

		// eslint-disable-next-line jquery/no-global-selector
		$( 'body' ).append( this.windowManager.$element );
	};
	OO.inheritClass( sd.LicenseDialogWidget, OO.ui.Widget );

	/**
	 * Returns a promise that will resolve once the window has been closed.
	 *
	 * @return {$.Promise}
	 */
	sd.LicenseDialogWidget.prototype.getConfirmation = function () {
		var deferred = $.Deferred(),
			cookie = 'wbmi-license-cc0';

		// check if we've agreed to this before
		if ( mw.cookie.get( cookie ) !== null ) {
			return deferred.resolve().promise();
		}

		this.openDialog();
		this.dialog.getActions().once( 'click', function ( action ) {
			// no matter what is clicked, we're good to go: the dialog has no
			// concept of rejecting the license - we only want to make sure
			// they've read this message :)
			deferred.resolve();

			if ( action.getAction() === 'accept' ) {
				mw.cookie.set( cookie, '1', { expires: 3 * 365 * 24 * 60 * 60, path: '/' } );
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

}( mw.mediaInfo.structuredData ) );
