'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	inputs = require( './inputs/index.js' ),
	QualifierValueInputWidget;

QualifierValueInputWidget = function ( config ) {
	this.config = $.extend( {}, config );
	this.types = {
		'wikibase-entityid': this.createEntityInput.bind( this ),
		quantity: this.createQuantityInput.bind( this ),
		string: this.createStringInput.bind( this ),
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
};
OO.inheritClass( QualifierValueInputWidget, OO.ui.Widget );
OO.mixinClass( QualifierValueInputWidget, ComponentWidget );

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
	var input = new inputs.EntityInputWidget(
		$.extend( {}, this.config, { classes: [], isQualifier: true } )
	).connect( this, {
		add: [ 'emit', 'enter' ],
		change: 'onChange'
	} );

	return input;
};

/**
 * Prepare a numerical input widget
 * @return {QuantityInputWidget} Numerical input
 */
QualifierValueInputWidget.prototype.createQuantityInput = function () {
	var input = new inputs.QuantityInputWidget(
		$.extend( {}, this.config, { classes: [], isQualifier: true } )
	).connect( this, {
		add: [ 'emit', 'enter' ],
		change: 'onChange'
	} );

	return input;
};

/**
 * Prepare a text input widget
 * @return {StringInputWidget} String input
 */
QualifierValueInputWidget.prototype.createStringInput = function () {
	var input = new inputs.StringInputWidget(
		$.extend( {}, this.config, { classes: [], isQualifier: true } )
	).connect( this, {
		add: [ 'emit', 'enter' ],
		change: 'onChange'
	} );

	return input;
};

/**
 * Prepare a globe coordinate input widget
 * @return {GlobeCoordinateInputWidget} Globe coordinate input
 */
QualifierValueInputWidget.prototype.createGlobeCoordinateInput = function () {
	var input = new inputs.GlobeCoordinateInputWidget(
		$.extend( {}, this.config, { classes: [], isQualifier: true } )
	);

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
	return new inputs.UnsupportedInputWidget(
		$.extend( {}, this.config, { classes: [], isQualifier: true } )
	);
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
	return this.state.input.getData();
};

/**
 * @param {dataValues.DataValue} data
 * @return {jQuery.Deferred}
 */
QualifierValueInputWidget.prototype.setData = function ( data ) {
	var self = this,
		type, input;

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
	type = data.getType();
	input = type in this.types ? this.types[ type ]() : this.createDisabledInput();

	return input.setData( data )
		.then( this.setState.bind( this, {
			type: type,
			input: input
		} ) )
		.then( function ( $element ) {
			self.allowEmitChange = true;
			self.emit( 'change' );
			return $element;
		} );
};

module.exports = QualifierValueInputWidget;
