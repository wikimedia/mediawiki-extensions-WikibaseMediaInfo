'use strict';

var FormatValueElement = require( './FormatValueElement.js' ),
	EntityInputWidget = require( './EntityInputWidget.js' ),
	QualifierValueInputWidget;

QualifierValueInputWidget = function ( config ) {
	this.config = $.extend( {}, config );

	QualifierValueInputWidget.parent.call( this, this.config );
	FormatValueElement.call( this, $.extend( {}, config ) );

	this.type = 'string';
	this.allowEmitChange = true;
	this.disabled = false;

	this.inputs = {
		'wikibase-entityid': this.createEntityInput(),
		quantity: this.createQuantityInput(),
		string: this.createTextInput(),
		unsupported: this.createDisabledInput()
	};

	this.render();
};

OO.inheritClass( QualifierValueInputWidget, OO.ui.Widget );
OO.mixinClass( QualifierValueInputWidget, FormatValueElement );

QualifierValueInputWidget.prototype.render = function () {
	var self = this,
		data,
		template,
		$element;

	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/QualifierValueInputWidget.mustache+dom'
	);

	data = {
		input: this.inputs,
		type: Object.keys( this.inputs ).reduce( function ( result, type ) {
			// `type` will be a map like: { quantity: true, string: false, ... }
			result[ type ] = self.type === type;
			return result;
		}, {} )
	};

	// detach existing rendered nodes before replacing the content altogether:
	// if the input type changes and we remove the old input from DOM, that
	// would also mean its event listeners get removed, and we don't want that
	// to happen in case we switch back to that input type...
	this.$element.children().detach();

	$element = template.render( data );
	this.$element.empty().append( $element );
};

/**
 * QualifierValueInputWidget is basically a wrapper for multiple different
 * input types - this'll let you change the input type.
 *
 * @param {string} type One of 'wikibase-entityid', 'quantity' or 'string'
 * @chainable
 * @return {QualifierValueInputWidget}
 */
QualifierValueInputWidget.prototype.setInputType = function ( type ) {
	if ( !( type in this.inputs ) ) {
		type = 'unsupported';
	}

	if ( this.type !== type ) {
		this.type = type;
		this.render();
	}

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
 * @return {OO.ui.TextInputWidget} Disabled text input
 */
QualifierValueInputWidget.prototype.createDisabledInput = function () {
	var input = new OO.ui.TextInputWidget( $.extend( {}, this.config, { classes: [] } ) );
	input.setDisabled( true );
	input.setValue( mw.message( 'wikibasemediainfo-unsupported-datatype-text' ).text() );
	return input;
};

/**
 * @return {Object|string}
 */
QualifierValueInputWidget.prototype.getInputValue = function () {
	var input = this.inputs[ this.type ];

	switch ( this.type ) {
		case 'wikibase-entityid':
			return {
				id: input.getData()
			};
		case 'quantity':
			return {
				// add leading '+' if no unit is present already
				amount: input.getValue().replace( /^(?![+-])/, '+' ),
				unit: '1'
			};
		case 'string':
			return input.getValue();
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

	if ( !data.equals( this.getData() ) ) {
		this.emit( 'change' );
	}

	this.formatValue( data, 'text/plain' ).then( function ( plain ) {
		var input = self.inputs[ data.getType() ];

		if ( data.getType() !== self.type ) {
			// input type may already have changed by the time this is formatted,
			// in which case the formatted input is no longer valid
			return;
		}

		// setData is supposed to behave asynchronously: we don't want it
		// to trigger change events when nothing has really changed - it
		// just takes a little time before we know how to display the input
		// and make it interactive, but that doesn't mean the data changed
		self.allowEmitChange = false;

		switch ( data.getType() ) {
			case 'wikibase-entityid':
				// entities widget will need to be aware of the id that is associated
				// with the label
				input.setValue( plain );
				input.setData( data.toJSON().id );
				// reset temporary value workaround - we can now interact with the
				// value, so we should fetch the result straight from input field
				self.value = undefined;
				break;
			case 'quantity':
				// replace thousands delimiter - that's only useful for display purposes
				input.setValue( plain.replace( /,/g, '' ) );
				// reset temporary value workaround - we can now interact with the
				// value, so we should fetch the result straight from input field
				self.value = undefined;
				break;
			case 'string':
				input.setValue( plain );
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
	var self = this;

	this.disabled = disabled;

	// setDisabled is called in constructor, before this.inputs may have been initialized
	if ( this.inputs ) {
		Object.keys( this.inputs ).forEach( function ( type ) {
			self.inputs[ type ].setDisabled( disabled );
		} );

		// the unsupported input field must always remain disabled
		this.inputs.unsupported.setDisabled( true );
	}

	return this;
};

module.exports = QualifierValueInputWidget;
