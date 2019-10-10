'use strict';

var CancelPublishWidget;

/**
 * Widget containing 'cancel' and 'publish' buttons
 *
 * @constructor
 */
CancelPublishWidget = function () {
	var cancelButton = new OO.ui.ButtonWidget( {
			framed: false,
			flags: [
				'destructive'
			],
			label: mw.message( 'wikibasemediainfo-filepage-cancel' ).text()
		} ),
		publishButton = new OO.ui.ButtonInputWidget( {
			// disabled by default
			disabled: true,
			type: 'submit',
			useInputTag: true,
			label: mw.message( 'wikibasemediainfo-filepage-publish' ).text(),
			flags: [
				'primary',
				'progressive'
			]
		} );

	cancelButton.connect( this, { click: [ 'emit', 'cancel' ] } );
	publishButton.connect( this, { click: [ 'emit', 'publish' ] } );

	CancelPublishWidget.parent.call(
		this,
		{
			content: [ cancelButton, publishButton ],
			classes: [ 'wbmi-entityview-cancelAndPublishButtons' ]
		}
	);

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
		cancelButton.$element.show();
	};
};

OO.inheritClass( CancelPublishWidget, OO.ui.Widget );

module.exports = CancelPublishWidget;
