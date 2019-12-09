'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	StringInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
StringInputWidget = function MediaInfoStatementsStringInputWidget( config ) {
	config = config || {};

	this.state = {
		value: '',
		isQualifier: !!config.isQualifier
	};

	this.input = new OO.ui.TextInputWidget( {
		value: this.state.value,
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true
	} );
	this.input.connect( this, { enter: 'onEnter' } );
	this.input.connect( this, { change: 'onChange' } );

	StringInputWidget.parent.call( this );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/StringInputWidget.mustache+dom'
	);
};
OO.inheritClass( StringInputWidget, OO.ui.Widget );
OO.mixinClass( StringInputWidget, AbstractInputWidget );
OO.mixinClass( StringInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
StringInputWidget.prototype.getTemplateData = function () {
	var button = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-input-widget__button' ],
		label: mw.message( 'wikibasemediainfo-string-input-button-text' ).text(),
		flags: [ 'primary', 'progressive' ],
		disabled: this.input.getValue() === ''
	} );
	button.connect( this, { click: 'onEnter' } );

	return {
		isQualifier: this.state.isQualifier,
		input: this.input,
		button: button
	};
};

StringInputWidget.prototype.onEnter = function () {
	this.emit( 'add', this );
};

StringInputWidget.prototype.onChange = function () {
	// update state to make sure template rerenders
	this.setState( { value: this.input.getValue() } )
		.then( this.emit.bind( this, 'change', this ) );
};

/**
 * @inheritDoc
 */
StringInputWidget.prototype.getRawValue = function () {
	return this.input.getValue();
};

/**
 * @inheritDoc
 */
StringInputWidget.prototype.getData = function () {
	return dataValues.newDataValue( 'string', this.getRawValue() );
};

/**
 * @inheritDoc
 */
StringInputWidget.prototype.setData = function ( data ) {
	this.input.setValue( data.toJSON() );
	return this.setState( { value: this.input.getValue() } );
};

module.exports = StringInputWidget;
