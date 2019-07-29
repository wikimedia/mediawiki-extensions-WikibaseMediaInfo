'use strict';

var CaptionsEditActionsWidget,
	CancelPublishWidget;

CancelPublishWidget = require( './CancelPublishWidget.js' );

/**
	* Widget containing other widgets to add a row, cancel, and save multi-lingual caption data
	*
	* For use with CaptionsPanel
	*
	* @constructor
	* @param {Object} config
	* @cfg {Object} captionsPanel CaptionsPanel object
	*/
CaptionsEditActionsWidget = function ( config ) {

	var cancelAndPublishButtons = new CancelPublishWidget( config.captionsPanel ),

		addCaptionButton = new OO.ui.ButtonWidget( {
			icon: 'add',
			label: mw.message( 'wikibasemediainfo-filepage-add-caption' ).text(),
			flags: 'progressive',
			classes: [ 'wbmi-entityview-addCaptionButton' ],
			framed: false
		} )
			.on( 'click', function () {
				config.captionsPanel.addNewEmptyLanguageRow();
			} ),

		editActions = new OO.ui.Element( {
			content: [ addCaptionButton, cancelAndPublishButtons.$element ],
			classes: [ 'wbmi-entityview-editActions' ]
		} );

	CaptionsEditActionsWidget.parent.call(
		this,
		{
			content: [ editActions ]
		}
	);

	this.disablePublish = function () {
		cancelAndPublishButtons.disablePublish();
	};

	this.enablePublish = function () {
		cancelAndPublishButtons.enablePublish();
	};

	this.setStateSending = function () {
		cancelAndPublishButtons.setStateSending();
		addCaptionButton.$element.hide();
	};

	this.setStateReady = function () {
		cancelAndPublishButtons.setStateReady();
		addCaptionButton.$element.show();
	};
};

OO.inheritClass( CaptionsEditActionsWidget, OO.ui.Widget );

module.exports = CaptionsEditActionsWidget;
