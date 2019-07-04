'use strict';

var FormatValueElement = require( './FormatValueElement.js' ),
	EntityInputWidget = require( './EntityInputWidget.js' ),
	QualifierValueInputWidget;

QualifierValueInputWidget = function ( config ) {
	this.config = $.extend( {}, config );

	QualifierValueInputWidget.parent.call( this, this.config );
	FormatValueElement.call( this, $.extend( {}, config ) );

	this.allowEmitChange = true;
	this.disabled = false;

	this.setInputType( 'string' );
};

OO.inheritClass( QualifierValueInputWidget, OO.ui.Widget );
OO.mixinClass( QualifierValueInputWidget, FormatValueElement );

/**
 * QualifierValueInputWidget is basically a wrapper for multiple different
 * input types - this'll let you change the input type.
 *
 * @param {string} type One of 'wikibase-entityid', 'quantity' or 'string'
 * @chainable
 * @return {QualifierValueInputWidget}
 */
QualifierValueInputWidget.prototype.setInputType = function ( type ) {
	if ( this.type === type ) {
		// nothing's changed, move along
		return this;
	}

	// remove existing element from DOM
	if ( this.input ) {
		this.input.$element.remove();
	}

	this.type = type;

	switch ( type ) {
		case 'wikibase-entityid':
			this.input = this.createEntityInput();
			break;
		case 'quantity':
			this.input = this.createQuantityInput();
			break;
		case 'string':
			this.input = this.createTextInput();
			break;
		default:
			this.input = this.createDisabledInput( type );
	}

	// add the new element
	this.$element.append( this.input.$element );

	return this;
};

/**
 * Prepare a WB Entity input widget
 * @return {EntityInputWidget} WB Entity input
 */
QualifierValueInputWidget.prototype.createEntityInput = function () {
	var input = new EntityInputWidget( $.extend( {}, this.config, { classes: [] } ) );
	input.setDisabled( this.disabled );
	input.connect( this, { dataChange: 'onChange' } );
	input.connect( this, { enter: [ 'emit', 'enter' ] } );
	return input;
};

/**
 * Prepare a numerical input widget
 * @return {OO.ui.NumberInputWidget} Numerical input
 */
QualifierValueInputWidget.prototype.createQuantityInput = function () {
	var input = new OO.ui.NumberInputWidget( $.extend( {}, this.config, { classes: [] } ) );
	input.setDisabled( this.disabled );
	input.connect( this, { change: 'onChange' } );
	input.connect( this, { enter: [ 'emit', 'enter' ] } );
	return input;
};
/**
 * Prepare a text input widget
 * @return {OO.ui.TextInputWidget} Text input
 */
QualifierValueInputWidget.prototype.createTextInput = function () {
	var input = new OO.ui.TextInputWidget( $.extend( {}, this.config, { classes: [] } ) );
	input.setDisabled( this.disabled );
	input.connect( this, { change: 'onChange' } );
	input.connect( this, { enter: [ 'emit', 'enter' ] } );
	return input;
};

/**
 * Prepare a disabled text input widget w/appropriate message
 * @param {Object} type
 * @return {OO.ui.TextInputWidget} Disabled text input
 */
QualifierValueInputWidget.prototype.createDisabledInput = function ( type ) {
	var input = new OO.ui.TextInputWidget( $.extend( {}, this.config, { classes: [] } ) );
	input.setDisabled( true );
	input.setValue( mw.message( 'wikibasemediainfo-unsupported-datatype', type ).text() );
	return input;
};

/**
 * @return {Object|string}
 */
QualifierValueInputWidget.prototype.getInputValue = function () {
	switch ( this.type ) {
		case 'wikibase-entityid':
			return {
				id: this.input.getData()
			};
		case 'quantity':
			return {
				// add leading '+' if no unit is present already
				amount: this.input.getValue().replace( /^(?![+-])/, '+' ),
				unit: '1'
			};
		case 'string':
			return this.input.getValue();
		default:
			return this.value;
	}
};

QualifierValueInputWidget.prototype.onChange = function () {
	if ( this.allowEmitChange ) {
		this.emit( 'change' );
	}
};

/**
 * @return {dataValues.DataValue}
 */
QualifierValueInputWidget.prototype.getData = function () {
	return dataValues.newDataValue( this.type, this.value || this.getInputValue() );
};

/**
 * @param {dataValues.DataValue} data
 * @chainable
 * @return {QualifierValueInputWidget}
 */
QualifierValueInputWidget.prototype.setData = function ( data ) {
	var self = this;

	this.setInputType( data.getType() );

	if ( !data.equals( this.data ) ) {
		this.emit( 'change' );
	}

	// temporarily save the value so that getValue() calls before below
	// promise has resolved will already respond with the correct value,
	// even though the input field doesn't have it yet...
	this.value = data.toJSON();

	this.formatValue( data, 'text/plain' ).then( function ( plain ) {
		// setData is supposed to behave asynchronously: we don't want it
		// to trigger change events when nothing has really changed - it
		// just takes a little time before we know how to display the input
		// and make it interactive, but that doesn't mean the data changed
		self.allowEmitChange = false;

		switch ( data.getType() ) {
			case 'wikibase-entityid':
				// entities widget will need to be aware of the id that is associated
				// with the label
				self.input.setValue( plain );
				self.input.setData( data.toJSON().id );
				// reset temporary value workaround - we can now interact with the
				// value, so we should fetch the result straight from input field
				self.value = undefined;
				break;
			case 'quantity':
				// replace thousands delimiter - that's only useful for display purposes
				self.input.setValue( plain.replace( /,/g, '' ) );
				// reset temporary value workaround - we can now interact with the
				// value, so we should fetch the result straight from input field
				self.value = undefined;
				break;
			case 'string':
				self.input.setValue( plain );
				// reset temporary value workaround - we can now interact with the
				// value, so we should fetch the result straight from input field
				self.value = undefined;
				break;
		}

		self.allowEmitChange = true;
	} );

	return this;
};

/**
 * @return {boolean}
 */
QualifierValueInputWidget.prototype.isDisabled = function () {
	return this.disabled;
};

/**
 * @param {boolean} disabled
 * @chainable
 * @return {QualifierValueInputWidget}
 */
QualifierValueInputWidget.prototype.setDisabled = function ( disabled ) {
	this.disabled = disabled;

	if ( this.input === undefined ||
		[ 'wikibase-entityid', 'quantity', 'string' ].indexOf( this.type ) < 0 ) {
		// don't allow enabling the input field for input types that are
		// not yet supported - those are just a disabled "not supported"
		// input field and should remain that way
		return this;
	}

	this.input.setDisabled( disabled );
	return this;
};

module.exports = QualifierValueInputWidget;
