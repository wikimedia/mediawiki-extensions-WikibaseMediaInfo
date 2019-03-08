'use strict';

var CancelPublishWidget;

/**
 * Widget containing 'cancel' and 'publish' buttons
 *
 * @constructor
 * @param {object} sdcPanel Panel object with makeReadOnly() and sendData() methods
 */
CancelPublishWidget = function ( sdcPanel ) {

	var cancelButton = new OO.ui.ButtonWidget( {
		framed: false,
		flags: [
			'destructive'
		],
		label: mw.message( 'wikibasemediainfo-filepage-cancel' ).text()
	} )
		.on( 'click', function () {
			var hasChanges = sdcPanel.hasChanges(),
				allowCloseWindow = mw.confirmCloseWindow( {
					message: mw.message( 'wikibasemediainfo-filepage-cancel-confirm' ).text(),
					test: function () { return hasChanges; }
				} );

			var closeWindowConfirmed = allowCloseWindow.trigger();

			if ( closeWindowConfirmed ) {
				sdcPanel.makeReadOnly();
			}
		} );

	var publishButton = new OO.ui.ButtonInputWidget( {
		// disabled by default
		disabled: true,
		type: 'submit',
		useInputTag: true,
		label: mw.message( 'wikibasemediainfo-filepage-publish' ).text(),
		flags: [
			'primary',
			'progressive'
		]
	} )
		.on( 'click', function () {
			sdcPanel.sendData();
		} );

	var widget = new OO.ui.Element( {
		content: [ cancelButton, publishButton ],
		classes: [ 'wbmi-entityview-cancelAndPublishButtons' ]
	} );

	this.hide = function () {
		widget.$element.hide().addClass( 'wbmi-hidden' );
	};

	this.show = function () {
		widget.$element.show().removeClass( 'wbmi-hidden' );
	};

	this.disablePublish = function () {
		publishButton.setDisabled( true );
	};

	this.enablePublish = function () {
		publishButton.setDisabled( false );
	};

	this.setStateSending = function () {
		publishButton.setDisabled( true );
		cancelButton.$element.hide();
	};

	this.setStateReady = function () {
		publishButton.setDisabled( false );
		cancelButton.$element.show();
	};

	this.$element = widget.$element;
};

module.exports = CancelPublishWidget;
