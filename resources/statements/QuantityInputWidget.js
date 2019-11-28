'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	QuantityInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {number} [config.value]
 * @param {boolean} [config.isQualifier]
 */
QuantityInputWidget = function MediaInfoStatementsQuantityInputWidget( config ) {
	config = config || {};

	this.state = {
		value: config.value || '',
		isQualifier: !!config.isQualifier
	};

	this.input = new OO.ui.NumberInputWidget( {
		value: this.state.value,
		classes: [ 'wbmi-quantity-input-input' ],
		isRequired: true
	} );
	this.input.connect( this, { enter: 'onEnter' } );
	this.input.connect( this, { change: 'onChange' } );

	QuantityInputWidget.parent.call( this );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/QuantityInputWidget.mustache+dom'
	);
};
OO.inheritClass( QuantityInputWidget, OO.ui.Widget );
OO.mixinClass( QuantityInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getTemplateData = function () {
	var button = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-quantity-input-button' ],
		label: mw.message( 'wikibasemediainfo-quantity-input-button-text' ).text(),
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

QuantityInputWidget.prototype.onEnter = function () {
	this.emit( 'addItem', this.input.getValue() );
};

QuantityInputWidget.prototype.onChange = function () {
	// update state to make sure template rerenders
	this.setState( { value: this.input.getValue() } )
		.then( this.emit.bind( this, 'change', this.input.getValue() ) );
};

/**
 * @return {Object}
 */
QuantityInputWidget.prototype.getData = function () {
	return {
		// add leading '+' if no unit is present already
		amount: this.input.getValue().replace( /^(?![+-])/, '+' ),
		unit: '1'
	};
};

/**
 * @param {Object} data
 * @return {jQuery.Promise}
 */
QuantityInputWidget.prototype.setData = function ( data ) {
	// replace leading '+' unit - that's only needed for internal storage,
	// but obvious for human input
	this.input.setValue( data.amount.replace( /^\+/, '' ) );
	return this.setState( { value: this.input.getValue() } );
};

module.exports = QuantityInputWidget;
