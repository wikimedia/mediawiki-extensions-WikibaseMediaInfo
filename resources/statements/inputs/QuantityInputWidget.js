'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	QuantityInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
QuantityInputWidget = function MediaInfoStatementsQuantityInputWidget( config ) {
	config = config || {};

	this.state = {
		value: '',
		isQualifier: !!config.isQualifier
	};

	this.input = new OO.ui.NumberInputWidget( {
		value: this.state.value,
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true
	} );
	this.input.connect( this, { enter: 'onEnter' } );
	this.input.connect( this, { change: 'onChange' } );

	QuantityInputWidget.parent.call( this );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/QuantityInputWidget.mustache+dom'
	);
};
OO.inheritClass( QuantityInputWidget, OO.ui.Widget );
OO.mixinClass( QuantityInputWidget, AbstractInputWidget );
OO.mixinClass( QuantityInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getTemplateData = function () {
	var button = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-input-widget__button' ],
		label: mw.message( 'wikibasemediainfo-quantity-input-button-text' ).text(),
		flags: [ 'primary', 'progressive' ],
		disabled: this.getRawValue() === ''
	} );
	button.connect( this, { click: 'onEnter' } );

	return {
		isQualifier: this.state.isQualifier,
		input: this.input,
		button: button
	};
};

QuantityInputWidget.prototype.onEnter = function () {
	this.emit( 'add', this );
};

QuantityInputWidget.prototype.onChange = function () {
	// update state to make sure template rerenders
	this.setState( { value: this.getRawValue() } )
		.then( this.emit.bind( this, 'change', this ) );
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getRawValue = function () {
	return this.input.getValue();
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getData = function () {
	return dataValues.newDataValue( 'quantity', {
		// add leading '+' if no unit is present already
		amount: this.getRawValue().replace( /^(?![+-])/, '+' ),
		unit: '1'
	} );
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.setData = function ( data ) {
	var value = data.toJSON().amount.replace( /^\+/, '' );

	// replace leading '+' unit - that's only needed for internal storage,
	// but obvious for human input
	this.input.setValue( value );
	return this.setState( { value: value } );
};

module.exports = QuantityInputWidget;
