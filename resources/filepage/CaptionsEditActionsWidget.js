'use strict';

var CaptionsEditActionsWidget,
	CancelPublishWidget;

CancelPublishWidget = require( './CancelPublishWidget.js' );

/**
 * Widget containing other widgets to add a row, cancel, and save multi-lingual caption data
 *
 * @constructor
 */
CaptionsEditActionsWidget = function () {

	var cancelAndPublishButtons = new CancelPublishWidget(),
		addCaptionButton = new OO.ui.ButtonWidget( {
			icon: 'add',
			label: mw.msg( 'wikibasemediainfo-filepage-add-caption' ),
			flags: 'progressive',
			classes: [ 'wbmi-entityview-addCaptionButton' ],
			framed: false
		} ),
		editActions = new OO.ui.Element( {
			content: [ addCaptionButton, cancelAndPublishButtons.$element ],
			classes: [ 'wbmi-entityview-editActions' ]
		} );

	cancelAndPublishButtons.connect( this, { cancel: [ 'emit', 'cancel' ] } );
	cancelAndPublishButtons.connect( this, { publish: [ 'emit', 'publish' ] } );
	addCaptionButton.connect( this, { click: [ 'emit', 'add' ] } );

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
