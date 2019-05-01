'use strict';

var FormatValueElement = require( './FormatValueElement.js' ),
	EntityInputWidget = require( './EntityInputWidget.js' ),
	QualifierValueInputWidget = function MediaInfoStatementsQualifierValueInputWidget( config ) {
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
			this.input = new EntityInputWidget( $.extend( {}, this.config, { classes: [] } ) );
			this.input.setDisabled( this.disabled );
			this.input.connect( this, { dataChange: 'onChange' } );
			this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
			break;
		case 'quantity':
			this.input = new OO.ui.NumberInputWidget( $.extend( {}, this.config, { classes: [] } ) );
			this.input.setDisabled( this.disabled );
			this.input.connect( this, { change: 'onChange' } );
			this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
			break;
		case 'string':
			this.input = new OO.ui.TextInputWidget( $.extend( {}, this.config, { classes: [] } ) );
			this.input.setDisabled( this.disabled );
			this.input.connect( this, { change: 'onChange' } );
			this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
			break;
		default:
			this.input = new OO.ui.TextInputWidget( $.extend( {}, this.config, { classes: [] } ) );
			this.input.setDisabled( true );
			this.input.setValue( mw.message( 'wikibasemediainfo-unsupported-datatype', type ).text() );
	}

	// add the new element
	this.$element.append( this.input.$element );

	return this;
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

	// temporarily save the value so that getValue() calls before below
	// promise has resolved will already respond with the correct value,
	// even though the input field doesn't have it yet...
	this.value = data.toJSON();

	this.emit( 'change' );

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
				self.input.setValue( plain.replace( ',', '' ) );
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

	if ( this.input === undefined || [ 'wikibase-entityid', 'quantity', 'string' ].indexOf( this.type ) < 0 ) {
		// don't allow enabling the input field for input types that are
		// not yet supported - those are just a disabled "not supported"
		// input field and should remain that way
		return this;
	}

	this.input.setDisabled( disabled );
	return this;
};

module.exports = QualifierValueInputWidget;
