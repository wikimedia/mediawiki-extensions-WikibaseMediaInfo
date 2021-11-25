'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	wbMonolingualTextLanguages = require( '../config/wbMonolingualTextLanguages.json' ),
	UlsWidget = require( 'wikibase.mediainfo.uls' ),
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	MonolingualTextInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
MonolingualTextInputWidget = function MediaInfoStatementsMonolingualTextInputWidget( config ) {
	config = config || {};

	this.state = {
		value: '',
		language: '',
		isQualifier: !!config.isQualifier
	};

	this.input = new OO.ui.TextInputWidget( {
		value: this.state.value,
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true,
		placeholder: mw.msg( 'wikibasemediainfo-monolingualtext-input-placeholder' )
	} );
	this.input.connect( this, { enter: 'onEnter' } );
	this.input.connect( this, { change: 'onChange' } );

	this.language = new UlsWidget( {
		language: this.state.language,
		languages: wbMonolingualTextLanguages,
		label: mw.msg( 'wikibasemediainfo-monolingualtext-language-label' )
	} );
	this.language.connect( this, { select: 'onChangeLanguage' } );

	MonolingualTextInputWidget.parent.call( this );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/MonolingualTextInputWidget.mustache+dom'
	);
};
OO.inheritClass( MonolingualTextInputWidget, OO.ui.Widget );
OO.mixinClass( MonolingualTextInputWidget, AbstractInputWidget );
OO.mixinClass( MonolingualTextInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
MonolingualTextInputWidget.prototype.getTemplateData = function () {
	var button = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-input-widget__button' ],
		label: mw.msg( 'wikibasemediainfo-monolingualtext-input-button-text' ),
		flags: [ 'progressive' ],
		disabled: !this.hasValidInput()
	} );
	button.connect( this, { click: 'onEnter' } );

	return {
		isQualifier: this.state.isQualifier,
		input: this.input,
		language: this.language,
		button: button
	};
};

MonolingualTextInputWidget.prototype.onEnter = function () {
	if ( this.hasValidInput() ) {
		this.emit( 'add', this );
	}
};

MonolingualTextInputWidget.prototype.onChange = function () {
	this.setState( { value: this.input.getValue() } )
		.then( this.emit.bind( this, 'change', this ) );
};

MonolingualTextInputWidget.prototype.onChangeLanguage = function () {
	this.setState( { language: this.language.getValue() } )
		.then( this.emit.bind( this, 'change', this ) );
};

/**
 * @inheritDoc
 */
MonolingualTextInputWidget.prototype.getRawValue = function () {
	return this.state.value;
};

/**
 * @inheritDoc
 */
MonolingualTextInputWidget.prototype.getRawValueOptions = function () {
	return { valuelang: this.state.language };
};

/**
 * @return {boolean}
 */
MonolingualTextInputWidget.prototype.hasValidInput = function () {
	return this.state.value !== '' && this.state.language !== '';
};

/**
 * @inheritDoc
 */
MonolingualTextInputWidget.prototype.getData = function () {
	if ( !this.hasValidInput() ) {
		throw new Error( 'No valid data' );
	}

	return dataValues.newDataValue( 'monolingualtext', {
		language: this.getRawValueOptions().valuelang,
		text: this.getRawValue()
	} );
};

/**
 * @inheritDoc
 */
MonolingualTextInputWidget.prototype.setData = function ( data ) {
	var json = data.toJSON();

	this.input.setValue( json.text );
	this.language.setValue( json.language );
	return this.setState( {
		value: this.input.getValue(),
		language: this.language.getValue()
	} );
};

/**
 * @inheritdoc
 */
MonolingualTextInputWidget.prototype.clear = function () {
	this.input.setValue( '' );
	this.input.setValidityFlag( true );
	this.language.setValue( '' );
	return this.setState( { value: '', language: '' } );
};

/**
 * @inheritdoc
 */
MonolingualTextInputWidget.prototype.focus = function () {
	this.input.focus();
};

/**
 * @inheritdoc
 */
MonolingualTextInputWidget.prototype.setDisabled = function ( disabled ) {
	this.input.setDisabled( disabled );
	this.language.setDisabled( disabled );
	ComponentWidget.prototype.setDisabled.call( this, disabled );
};

/**
 * @inheritDoc
 */
MonolingualTextInputWidget.prototype.flagAsInvalid = function () {
	this.input.setValidityFlag( false );
};

module.exports = MonolingualTextInputWidget;
