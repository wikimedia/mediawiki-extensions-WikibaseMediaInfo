'use strict';

var CancelPublishWidget;

/**
 * Widget containing 'cancel' and 'publish' buttons
 *
 * @constructor
 * @param {Object} sdcPanel Panel object with makeReadOnly() and sendData() methods
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
				var hasChanges = sdcPanel.hasChanges();

				if ( hasChanges ) {
					OO.ui.confirm(
						mw.msg( 'wikibasemediainfo-filepage-cancel-confirm' ),
						{
							title: mw.msg( 'wikibasemediainfo-filepage-cancel-confirm-title' ),
							actions: [
								{
									action: 'accept',
									label: mw.msg( 'wikibasemediainfo-filepage-cancel-confirm-accept' ),
									flags: [ 'primary', 'destructive' ]
								},
								{
									action: 'reject',
									label: mw.msg( 'ooui-dialog-message-reject' ),
									flags: 'safe'
								}
							]
						}
					).then( function ( confirmed ) {
						if ( confirmed ) {
							sdcPanel.makeReadOnly();
						}
					} );
				} else {
					sdcPanel.makeReadOnly();
				}
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
		} )
			.on( 'click', function () {
				sdcPanel.sendData();
			} ),

		widget = new OO.ui.Element( {
			content: [ cancelButton, publishButton ],
			classes: [ 'wbmi-entityview-cancelAndPublishButtons' ]
		} );

	this.hide = function () {
		widget.$element.hide();
	};

	this.show = function () {
		widget.$element.show();
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
		cancelButton.$element.show();
	};

	this.$element = widget.$element;
};

module.exports = CancelPublishWidget;
