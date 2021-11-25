'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	EntityInputWidget = require( './EntityInputWidget.js' ),
	MonolingualTextInputWidget = require( './MonolingualTextInputWidget.js' ),
	QuantityInputWidget = require( './QuantityInputWidget.js' ),
	StringInputWidget = require( './StringInputWidget.js' ),
	TimeInputWidget = require( './TimeInputWidget.js' ),
	GlobeCoordinateInputWidget = require( './GlobeCoordinateInputWidget.js' ),
	UnsupportedInputWidget = require( './UnsupportedInputWidget.js' ),
	datamodel = require( 'wikibase.datamodel' ),
	valueTypes = {
		VALUE: datamodel.PropertyValueSnak.TYPE,
		SOMEVALUE: datamodel.PropertySomeValueSnak.TYPE,
		NOVALUE: datamodel.PropertyNoValueSnak.TYPE
	},
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
		type: undefined, // default to unsupported input type
		classes: []
	}, config );

	this.types = {
		'wikibase-entityid': EntityInputWidget,
		monolingualtext: MonolingualTextInputWidget,
		quantity: QuantityInputWidget,
		string: StringInputWidget,
		time: TimeInputWidget,
		globecoordinate: GlobeCoordinateInputWidget
	};

	this.allowEmitChange = true;

	this.state = {
		type: this.config.type,
		input: this.createInput( this.config.type ),
		snakType: valueTypes.VALUE
	};

	this.snakTypeWidget = new OO.ui.DropdownInputWidget( {
		classes: [ 'wbmi-input-wrapper__snak-type' ],
		dropdown: {
			invisibleLabel: true
		},
		options: [
			{
				data: valueTypes.VALUE,
				label: mw.message( 'wikibasemediainfo-filepage-statement-custom-value-option' ).parse()
			},
			{
				data: valueTypes.SOMEVALUE,
				label: mw.message( 'wikibasemediainfo-filepage-statement-some-value-option' ).parse()
			},
			{
				data: valueTypes.NOVALUE,
				label: mw.message( 'wikibasemediainfo-filepage-statement-no-value-option' ).parse()
			}
		],
		title: mw.message( 'wikibasemediainfo-filepage-statement-value-type-dropdown-title' ).parse()
	} );

	this.snakTypeWidget.dropdownWidget.setIcon( 'ellipsis' );
	this.snakTypeWidget.dropdownWidget.setIndicator( null );
	this.snakTypeWidget.connect( this, { change: 'onSnakTypeChange' } );

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
		errors = this.getErrors(),
		errorMessages = ( errors.length > 0 ) ?
			errors.map( function ( error ) {
				return new OO.ui.MessageWidget( {
					type: 'error',
					label: error,
					classes: [ 'wbmi-statement-error-msg' ]
				} );
			} ) : null,
		// Currently somevalue/novalue are only intended to be used with
		// Wikidata items. Somevalue/novalue snaks for other datatypes added via
		// the API will be displayed and can be deleted but cannot be edited,
		// and these snaks cannot be added for other datatypes via this UI.
		//
		// To allow these snaks for all datatypes, this variable and its
		// associated template logic should be removed, and the getData method
		// of all datatypes should account for the possibility of no data, which
		// happens once on page load for existing items.
		showSnakTypeWidget = this.state.type === 'wikibase-entityid';

	// make sure input accurately reflects disabled state
	this.state.input.setDisabled( this.isDisabled() || !( this.state.type in this.types ) );

	return {
		errors: errorMessages,
		isQualifier: this.config.isQualifier,
		showSnakTypeWidget: showSnakTypeWidget,
		snakTypeWidget: this.snakTypeWidget,
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
 * @param {string} type One of 'wikibase-entityid', 'quantity', 'time', 'string',
 *  'globecoordinate', or 'monolingualtext'
 * @return {jQuery.Promise}
 */
MultiTypeInputWrapperWidget.prototype.setInputType = function ( type ) {
	var self = this,
		changed = this.state.type !== type || this.getSnakType() !== valueTypes.VALUE,
		input = this.createInput( type );

	return this.setState( {
		type: type,
		// Always reset snakType to value when property changes.
		snakType: valueTypes.VALUE,
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
 * Handle UI changes based on the selected snak type.
 *
 * @param {string} snakType
 * @return {jQuery.Promise}
 */
MultiTypeInputWrapperWidget.prototype.onSnakTypeChange = function ( snakType ) {
	var input,
		promise;

	switch ( snakType ) {
		case valueTypes.SOMEVALUE:
		case valueTypes.NOVALUE:

			// Create a disabled string input with the appropriate message.
			input = this.createInput( 'string' );
			input.input.setValue(
				mw.message(
					( snakType === valueTypes.SOMEVALUE ) ?
						'wikibasemediainfo-filepage-statement-some-value' :
						'wikibasemediainfo-filepage-statement-no-value'
				).parse()
			);
			this.setDisabled( true );

			promise = this.setState( {
				snakType: snakType,
				input: input
			} );

			// If this is a statement input, immediately add the new item.
			if ( !this.config.isQualifier ) {
				promise = promise.then( input.onEnter.bind( input ) );
			}
			break;

		default:
			// Create a new input with the type corresponding to the property.
			this.setDisabled( false );
			input = this.createInput( this.state.type );
			promise = this.setState( {
				snakType: snakType,
				input: input
			} );
	}

	// Create the new input, update state, and emit a change.
	return promise
		.then( this.emit.bind( this, 'change', this ) );
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
	return this.getSnakType() === valueTypes.VALUE ? this.state.input.getData() : null;
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.setData = function ( data ) {
	var self = this,
		type = data ? data.getType() : this.state.type,
		input;

	try {
		if ( this.state.snakType !== valueTypes.VALUE || data.equals( this.getData() ) ) {
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
 * Set the data type in state so we can use it to create an input for an
 * existing value. This is only relevant for existing qualifiers.
 *
 * @param {string} dataType
 * @return {jQuery.Promise}
 */
MultiTypeInputWrapperWidget.prototype.setDataType = function ( dataType ) {
	return this.setState( { type: dataType } );
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.clear = function () {
	this.setSnakType( valueTypes.VALUE );
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
	ComponentWidget.prototype.setDisabled.call( this, disabled );
};

/**
 * @inheritDoc
 */
MultiTypeInputWrapperWidget.prototype.parseValue = function ( propertyId, datatype ) {
	// For somevalue and novalue snaks, there is no value.
	if ( this.getSnakType() !== valueTypes.VALUE ) {
		return $.Deferred().resolve( null ).promise( { abort: function () {} } );
	}

	return this.state.input.parseValue( propertyId, datatype );
};

/**
 * Get the snakType (value, somevalue, or novalue).
 *
 * @return {string}
 */
MultiTypeInputWrapperWidget.prototype.getSnakType = function () {
	return this.state.snakType;
};

/**
 * Set the snakType.
 *
 * @param {string} snakType
 */
MultiTypeInputWrapperWidget.prototype.setSnakType = function ( snakType ) {
	this.snakTypeWidget.setValue( snakType );
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
