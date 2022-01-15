'use strict';

var CaptionDataEditor,
	wbTermsLanguages = require( 'wikibase.mediainfo.statements' ).config.wbTermsLanguages,
	UlsWidget = require( 'wikibase.mediainfo.uls' );

/**
 * A value object holding all relevant widgets for editing a single caption
 *
 * @constructor
 * @param {string} guid
 * @param {CaptionData} captionData
 * @param {Object} [config]
 * @param {number} [config.minCaptionLength]
 * @param {number} [config.maxCaptionLength]
 * @param {number} [config.warnWithinMaxCaptionLength]
 */
CaptionDataEditor = function ( guid, captionData, config ) {
	var self = this;

	config = config || {};

	OO.EventEmitter.call( this );

	this.minCaptionLength = config.minCaptionLength || mw.config.get( 'wbmiMinCaptionLength' );
	this.maxCaptionLength = config.maxCaptionLength || mw.config.get( 'wbmiMaxCaptionLength' );
	this.warnWithinMaxCaptionLength = config.warnWithinMaxCaptionLength || 0;

	this.languageSelector = new UlsWidget( {
		languages: wbTermsLanguages
	} );
	if ( captionData.languageCode !== '' ) {
		this.languageSelector.setValue( captionData.languageCode );
	}
	this.languageSelector.on( 'select', function () {
		self.emit( 'languageSelectorUpdated' );
	} );

	this.textInput = new OO.ui.TextInputWidget( {
		validate: function ( value ) {
			return ( self.minCaptionLength === undefined || value.length >= self.minCaptionLength ) &&
				( self.maxCaptionLength === undefined || value.length <= self.maxCaptionLength );
		},
		value: captionData.text,
		dir: captionData.direction,
		placeholder: captionData.text === '' ? mw.msg( 'wikibasemediainfo-filepage-caption-empty' ) : '',
		classes: [ 'wbmi-caption-textInput' ]
	} );
	this.textInput
		.on( 'change', function () {
			self.textInput.getValidity()
				.done( function () {
					var length = self.textInput.getValue().length,
						lengthDiff;

					self.setInputError( '' );

					if ( self.maxCaptionLength !== undefined ) {
						lengthDiff = self.maxCaptionLength - length;
						if (
							lengthDiff >= 0 &&
							lengthDiff < self.warnWithinMaxCaptionLength
						) {
							self.setInputWarning( mw.msg(
								'wikibasemediainfo-filepage-caption-approaching-limit',
								lengthDiff
							) );
						} else {
							self.setInputWarning( '' );
						}
					}
				} )
				.fail( function () {
					var length = self.textInput.getValue().length;

					self.setInputWarning( '' );

					if ( self.minCaptionLength !== undefined && self.minCaptionLength - length > 0 ) {
						self.setInputError( mw.message(
							'wikibasemediainfo-filepage-caption-too-short',
							self.minCaptionLength - length
						).escaped() );
					} else if ( self.maxCaptionLength !== undefined && length - self.maxCaptionLength > 0 ) {
						self.setInputError( mw.message(
							'wikibasemediainfo-filepage-caption-too-long',
							length - self.maxCaptionLength
						).escaped() );
					}
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
