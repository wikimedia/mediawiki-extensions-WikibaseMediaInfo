'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	EntityInputWidget = require( './EntityInputWidget.js' ),
	GlobeCoordinateInputWidget = require( './GlobeCoordinateInputWidget.js' ),
	QualifierValueInputWidget;

QualifierValueInputWidget = function ( config ) {
	this.config = $.extend( {}, config );
	this.types = {
		'wikibase-entityid': this.createEntityInput.bind( this ),
		quantity: this.createQuantityInput.bind( this ),
		string: this.createTextInput.bind( this ),
		globecoordinate: this.createGlobeCoordinateInput.bind( this )
	};
	this.allowEmitChange = true;

	this.state = {
		type: 'string',
		input: this.types.string()
	};

	QualifierValueInputWidget.parent.call( this, this.config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/QualifierValueInputWidget.mustache+dom'
	);
	FormatValueElement.call( this, $.extend( {}, config ) );
};
OO.inheritClass( QualifierValueInputWidget, OO.ui.Widget );
OO.mixinClass( QualifierValueInputWidget, ComponentWidget );
OO.mixinClass( QualifierValueInputWidget, FormatValueElement );

/**
 * @inheritDoc
 */
QualifierValueInputWidget.prototype.getTemplateData = function () {
	var self = this;

	// make sure input accurately reflects disabled state
	this.state.input.setDisabled( this.isDisabled() || !( this.state.type in this.types ) );

	return {
		input: this.state.input,
		type: Object.keys( this.types ).reduce( function ( result, type ) {
			// `type` will be a map like: { quantity: true, string: false, ... }
			result[ type ] = self.state.type === type;
			return result;
		}, { unsupported: !( this.state.type in this.types ) } )
	};
};

/**
 * QualifierValueInputWidget is basically a wrapper for multiple different
 * input types - this'll let you change the input type.
 *
 * @param {string} type One of 'wikibase-entityid', 'quantity', 'string' or
 *  'globecoordinate'
 * @return {jQuery.Promise}
 */
QualifierValueInputWidget.prototype.setInputType = function ( type ) {
	var self = this,
		changed = this.state.type !== type,
		input = type in this.types ? this.types[ type ]() : this.createDisabledInput();

	return this.setState( {
		type: type,
		// re-use existing input if the type has not changed
		input: changed ? input : this.state.input
	} ).then( function ( $element ) {
		if ( changed ) {
			self.emit( 'change' );
		}
		return $element;
	} );
};

/**
 * Prepare a WB Entity input widget
 * @return {EntityInputWidget} WB Entity input
 */
QualifierValueInputWidget.prototype.createEntityInput = function () {
	var input = new EntityInputWidget( $.extend( {}, this.config, { classes: [] } ) );
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
	input.connect( this, { change: 'onChange' } );
	input.connect( this, { enter: [ 'emit', 'enter' ] } );
	return input;
};

/**
 * Prepare a globe coordinate input widget
 * @return {GlobeCoordinateInputWidget} Globe coordinate input
 */
QualifierValueInputWidget.prototype.createGlobeCoordinateInput = function () {
	var input = new GlobeCoordinateInputWidget( $.extend( {}, this.config, { classes: [] } ) );
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
	input.setValue( mw.message( 'wikibasemediainfo-unsupported-datatype-text' ).text() );
	return input;
};

/**
 * @return {Object|string}
 */
QualifierValueInputWidget.prototype.getInputValue = function () {
	switch ( this.state.type ) {
		case 'wikibase-entityid':
			return {
				id: this.state.input.getData()
			};
		case 'quantity':
			return {
				// add leading '+' if no unit is present already
				amount: this.state.input.getValue().replace( /^(?![+-])/, '+' ),
				unit: '1'
			};
		case 'string':
			return this.state.input.getValue();
		case 'globecoordinate':
			return this.state.input.getData();
		default:
			return this.state.input.getData();
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
	return dataValues.newDataValue( this.state.type, this.getInputValue() );
};

/**
 * @param {dataValues.DataValue} data
 * @return {jQuery.Deferred}
 */
QualifierValueInputWidget.prototype.setData = function ( data ) {
	var self = this;

	try {
		if ( data.equals( this.getData() ) ) {
			return $.Deferred().resolve( this.$element ).promise();
		}
	} catch ( e ) {
		// we don't have valid data now, but that's ok, we're about
		// to set new data...
	}

	// we just confirmed that data *has* changed
	// we don't want these new input fields to cause change events when
	// we populate then with the given data, because that'd be unreliable
	// (e.g. it might *not* fire an event when we populate it with an
	// empty value...)
	// we'll make sure below events don't propagate, but then emit our
	// own later on!
	this.allowEmitChange = false;
	return $.Deferred().resolve().promise()
		.then( this.createInputFromData.bind( this, data.getType(), data ) )
		.then( function ( input ) {
			self.allowEmitChange = true;
			return self.setState( {
				type: data.getType(),
				input: input
			} );
		} )
		.then( function ( $element ) {
			self.emit( 'change' );
			return $element;
		} );
};

/**
 * @param {string} type
 * @param {dataValues.DataValue} data
 * @return {jQuery.Promise|*} Input object, or promise resolving with one
 */
QualifierValueInputWidget.prototype.createInputFromData = function ( type, data ) {
	var input = type in this.types ? this.types[ type ]() : this.createDisabledInput();

	switch ( type ) {
		case 'wikibase-entityid':
			// entities widget will need to be aware of the id that is associated
			// with the label
			return this.formatValue( data, 'text/plain' ).then( function ( plain ) {
				input.setValue( plain );
				input.setData( data.toJSON().id );
				return input;
			} );
		case 'quantity':
			// replace leading '+' unit - that's only needed for internal storage,
			// but obvious for human input
			input.setValue( data.getAmount().getValue().replace( /^\+/, '' ) );
			return input;
		case 'string':
			input.setValue( data.getValue() );
			return input;
		case 'globecoordinate':
			return input.setData( data.toJSON() ).then( function () {
				return input;
			} );
		default:
			// unsupported data types
			input.setData( data.toJSON() );
			return input;
	}
};

module.exports = QualifierValueInputWidget;
