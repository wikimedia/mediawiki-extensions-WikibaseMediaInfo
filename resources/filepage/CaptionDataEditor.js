'use strict';

var CaptionDataEditor,
	UlsWidget = require( './UlsWidget.js' );

/**
 * A value object holding all relevant widgets for editing a single caption
 *
 * @constructor
 * @param {string} guid
 * @param {CaptionData} captionData
 * @param {Object} [config]
 * @param {number} [config.maxCaptionLength]
 * @param {number} [config.warnWithinMaxCaptionLength]
 */
CaptionDataEditor = function ( guid, captionData, config ) {
	var self = this;

	config = config || {};

	OO.EventEmitter.call( this );

	this.maxCaptionLength = config.maxCaptionLength || mw.config.get( 'wbmiMaxCaptionLength' );
	this.warnWithinMaxCaptionLength = config.warnWithinMaxCaptionLength || 0;

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
					self.setInputError( '' );
					if (
						lengthDiff >= 0 &&
						lengthDiff < self.warnWithinMaxCaptionLength
					) {
						self.setInputWarning( mw.message(
							'wikibasemediainfo-filepage-caption-approaching-limit',
							lengthDiff
						).text() );
					} else {
						self.setInputWarning( '' );
					}
				} )
				.fail( function () {
					self.setInputWarning( '' );
					self.setInputError( mw.message(
						'wikibasemediainfo-filepage-caption-too-long',
						self.textInput.getValue().length - self.maxCaptionLength
					).text() );
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
};

OO.mixinClass( CaptionDataEditor, OO.EventEmitter );

/**
 * @return {UlsWidget}
 */
CaptionDataEditor.prototype.getLanguageSelector = function () {
	return this.languageSelector;
};

/**
 * @return {OO.ui.TextInputWidget}
 */
CaptionDataEditor.prototype.getTextInput = function () {
	return this.textInput;
};

/**
 * @return {OO.ui.ButtonWidget}
 */
CaptionDataEditor.prototype.getDeleter = function () {
	return this.deleter;
};

/**
 * @param {boolean} disabled
 */
CaptionDataEditor.prototype.setDisabled = function ( disabled ) {
	this.textInput.setDisabled( disabled );
};

/**
 * @param {string} text
 */
CaptionDataEditor.prototype.setInputError = function ( text ) {
	this.inputError = text;
};

/**
 * @param {string} text
 */
CaptionDataEditor.prototype.setInputWarning = function ( text ) {
	this.inputWarning = text;
};

/**
 * @return {string}
 */
CaptionDataEditor.prototype.getInputError = function () {
	return this.inputError;
};

/**
 * @return {string}
 */
CaptionDataEditor.prototype.getInputWarning = function () {
	return this.inputWarning;
};

/**
 * @return {string}
 */
CaptionDataEditor.prototype.getLanguageCode = function () {
	return this.languageSelector.getValue();
};

/**
 * @return {string}
 */
CaptionDataEditor.prototype.getText = function () {
	return this.textInput.getValue();
};

module.exports = CaptionDataEditor;
