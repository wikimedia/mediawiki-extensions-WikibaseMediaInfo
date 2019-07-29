'use strict';

var CaptionDataEditor,
	UlsWidget = require( './UlsWidget.js' );

/**
 * A value object holding all relevant widgets for editing a single caption
 *
 * @constructor
 * @param {string} guid
 * @param {CaptionData} captionData
 * @param {CaptionsPanel} captionsPanel
 */
CaptionDataEditor = function ( guid, captionData, captionsPanel ) {
	var self = this;

	OO.EventEmitter.call( this );

	this.captionsPanel = captionsPanel;
	this.maxCaptionLength = mw.config.get( 'wbmiMaxCaptionLength' );

	this.languageSelector = new UlsWidget( {
		languages: mw.config.get( 'wbTermsLanguages' )
	} );
	if ( captionData.languageCode !== '' ) {
		this.languageSelector.setValue( captionData.languageCode );
	}
	this.languageSelector.on( 'select', function () {
		self.emit( 'languageSelectorUpdated' );
	} );

	this.textInput = new OO.ui.TextInputWidget( {
		validate: function ( value ) {
			return value.length <= self.maxCaptionLength;
		},
		value: captionData.text,
		dir: captionData.direction,
		placeholder: captionData.text === '' ? mw.message( 'wikibasemediainfo-filepage-caption-empty' ).text() : '',
		classes: [ 'wbmi-caption-textInput' ]
	} );
	this.textInput
		.on( 'change', function () {
			self.textInput.getValidity()
				.done( function () {
					var lengthDiff =
						self.maxCaptionLength - self.textInput.getValue().length;
					self.inputError = '';
					if (
						lengthDiff >= 0 &&
						lengthDiff < self.captionsPanel.warnWithinMaxCaptionLength
					) {
						self.inputWarning = mw.message(
							'wikibasemediainfo-filepage-caption-approaching-limit',
							lengthDiff
						).text();
					} else {
						self.inputWarning = '';
					}
				} )
				.fail( function () {
					self.inputWarning = '';
					self.inputError = mw.message(
						'wikibasemediainfo-filepage-caption-too-long',
						self.textInput.getValue().length - self.maxCaptionLength
					).text();
				} )
				.always( function () {
					self.emit( 'textInputChanged' );
				} );
		} )
		.on( 'keypress', function ( event ) {
			// if the key pressed is the 'enter' key
			if ( event.keycode === 13 || event.which === 13 ) {
				self.emit( 'textInputSubmitted' );
			}
		} );

	this.deleter = new OO.ui.ButtonWidget( {
		icon: 'trash',
		framed: false,
		flags: 'destructive',
		classes: [ 'wbmi-caption-deleteButton' ],
		id: guid
	} );
	this.deleter.on( 'click', function () {
		self.emit( 'captionDeleted', guid );
	} );

	this.inputError = '';
	this.inputWarning = '';

	this.enable();
};

OO.mixinClass( CaptionDataEditor, OO.EventEmitter );

CaptionDataEditor.prototype.disable = function () {
	this.textInput.setDisabled( true );
	this.disconnect( this.captionsPanel, { captionDeleted: 'onCaptionDeleted' } );
	this.disconnect( this.captionsPanel, { languageSelectorUpdated: 'onDataChanged' } );
	this.disconnect( this.captionsPanel, { textInputChanged: 'onDataChanged' } );
	this.disconnect( this.captionsPanel, { textInputSubmitted: 'sendData' } );
};

CaptionDataEditor.prototype.enable = function () {
	this.textInput.setDisabled( false );
	this.connect( this.captionsPanel, { captionDeleted: 'onCaptionDeleted' } );
	this.connect( this.captionsPanel, { languageSelectorUpdated: 'onDataChanged' } );
	this.connect( this.captionsPanel, { textInputChanged: 'onDataChanged' } );
	this.connect( this.captionsPanel, { textInputSubmitted: 'sendData' } );
};

module.exports = CaptionDataEditor;
