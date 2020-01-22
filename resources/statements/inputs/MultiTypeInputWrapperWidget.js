'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	EntityInputWidget = require( './EntityInputWidget.js' ),
	QuantityInputWidget = require( './QuantityInputWidget.js' ),
	StringInputWidget = require( './StringInputWidget.js' ),
	GlobeCoordinateInputWidget = require( './GlobeCoordinateInputWidget.js' ),
	UnsupportedInputWidget = require( './UnsupportedInputWidget.js' ),
	MultiTypeInputWrapperWidget;

/**
 * This input widget is essentially a wrapper around other input types,
 * and allows switching the input types.
 *
 * @constructor
 * @param {Object} config
 * @param {string} [config.type]
 * @param {Array} [config.classes]
 * @param {boolean} [config.isQualifier]
 */
MultiTypeInputWrapperWidget = function ( config ) {
	this.config = $.extend( {
		isQualifier: false,
		type: 'string',
		classes: []
	}, config );

	this.types = {
		'wikibase-entityid': EntityInputWidget,
		quantity: QuantityInputWidget,
		string: StringInputWidget,
		globecoordinate: GlobeCoordinateInputWidget
	};

	this.allowEmitChange = true;

	this.state = {
		errors: [],
		type: 'string',
		input: this.createInput( this.config.type )
	};

	MultiTypeInputWrapperWidget.parent.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/MultiTypeInputWrapperWidget.mustache+dom'
	);
};
OO.inheritClass( MultiTypeInputWrapperWidget, OO.ui.Widget );
OO.mixinClass( MultiTypeInputWrapperWidget, AbstractInputWidget );
OO.mixinClass( MultiTypeInputWrapperWidget, ComponentWidget );

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.getTemplateData = function () {
	var self = this,
		errorMessages = ( this.state.errors.length > 0 ) ?
			this.state.errors.map( function ( error ) {
				return new OO.ui.MessageWidget( {
					type: 'error',
					label: error,
					classes: [ 'wbmi-statement-error-msg' ]
				} );
			} ) : null;

	// make sure input accurately reflects disabled state
	this.state.input.setDisabled( this.isDisabled() || !( this.state.type in this.types ) );

	return {
		errors: errorMessages,
		isQualifier: this.config.isQualifier,
		input: this.state.input,
		type: Object.keys( this.types ).reduce( function ( result, type ) {
			// `type` will be a map like: { quantity: true, string: false, ... }
			result[ type ] = self.state.type === type;
			return result;
		}, { unsupported: !( this.state.type in this.types ) } )
	};
};

/**
 * MultiTypeInputWrapperWidget is basically a wrapper for multiple different
 * input types - this'll let you change the input type.
 *
 * @param {string} type One of 'wikibase-entityid', 'quantity', 'string' or
 *  'globecoordinate'
 * @return {jQuery.Promise}
 */
MultiTypeInputWrapperWidget.prototype.setInputType = function ( type ) {
	var self = this,
		changed = this.state.type !== type,
		input = this.createInput( type );

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
 * @param {string} type
 * @return {AbstractInputWidget}
 */
MultiTypeInputWrapperWidget.prototype.createInput = function ( type ) {
	var Constructor = type in this.types ? this.types[ type ] : UnsupportedInputWidget;

	return new Constructor( { isQualifier: this.config.isQualifier } ).connect( this, {
		add: [ 'emit', 'add', this ],
		change: 'onChange'
	} );
};

MultiTypeInputWrapperWidget.prototype.onChange = function () {
	if ( this.allowEmitChange ) {
		this.emit( 'change' );
	}
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.getRawValue = function () {
	return this.state.input.getRawValue();
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.getRawValueOptions = function () {
	return this.state.input.getRawValueOptions();
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.getData = function () {
	return this.state.input.getData();
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.setData = function ( data ) {
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
	input = this.createInput( type );

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

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.clear = function () {
	return this.state.input.clear();
};

/**
 * @inheritdoc
 */
MultiTypeInputWrapperWidget.prototype.focus = function () {
	this.state.input.focus();
};

/**
 * @inheritdoc
 */
MultiTypeInputWrapperWidget.prototype.setDisabled = function ( disabled ) {
	this.state.input.setDisabled( disabled );
	MultiTypeInputWrapperWidget.parent.prototype.setDisabled.call( this, disabled );
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.parseValue = function ( propertyId ) {
	return this.state.input.parseValue( propertyId );
};

/**
 * @inheritdoc
 */
MultiTypeInputWrapperWidget.prototype.setErrors = function ( errors ) {
	var self = this;

	return ComponentWidget.prototype.setErrors.call( this, errors )
		.then( function () {
			if ( errors.length > 0 ) {
				self.state.input.flagAsInvalid();
			}
		} );
};

module.exports = MultiTypeInputWrapperWidget;
