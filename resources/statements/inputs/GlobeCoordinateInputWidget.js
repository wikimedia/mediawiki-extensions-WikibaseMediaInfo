'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	GlobeCoordinateInputWidget;

/**
 * Widget that wraps globe-coordinate fields.
 *
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
GlobeCoordinateInputWidget = function MediaInfoStatementsGlobeCoordinateInputWidget( config ) {
	config = config || {};

	this.state = {
		latitude: '',
		longitude: '',
		precision: '',
		isQualifier: !!config.isQualifier
	};

	this.latitudeInput = new OO.ui.TextInputWidget( $.extend( {
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true,
		type: 'number',
		validate: this.validateInput.bind( this, 'latitude' ),
		placeholder: mw.message( 'wikibasemediainfo-latitude-input-placeholder' ).text()
	} ) );

	this.longitudeInput = new OO.ui.TextInputWidget( $.extend( {
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true,
		type: 'number',
		validate: this.validateInput.bind( this, 'longitude' ),
		placeholder: mw.message( 'wikibasemediainfo-longitude-input-placeholder' ).text()
	} ) );

	this.precisionInput = new OO.ui.DropdownInputWidget( $.extend( {
		options: this.getPrecisionOptions(),
		$overlay: true
	} ) );

	this.latitudeInput.connect( this, { change: 'onChange' } );
	this.longitudeInput.connect( this, { change: 'onChange' } );
	this.precisionInput.connect( this, { change: 'onChange' } );

	GlobeCoordinateInputWidget.parent.call( this );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/GlobeCoordinateInputWidget.mustache+dom'
	);
};
OO.inheritClass( GlobeCoordinateInputWidget, OO.ui.Widget );
OO.mixinClass( GlobeCoordinateInputWidget, AbstractInputWidget );
OO.mixinClass( GlobeCoordinateInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getTemplateData = function () {
	var button = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-input-widget__button' ],
		label: mw.message( 'wikibasemediainfo-string-input-button-text' ).text(),
		flags: [ 'primary', 'progressive' ],
		disabled: (
			this.latitudeInput.getValue() === '' ||
			this.longitudeInput.getValue() === '' ||
			this.precisionInput.getValue() === ''
		)
	} );
	button.connect( this, { click: [ 'emit', 'add', this ] } );

	return {
		isQualifier: this.state.isQualifier,
		latitude: {
			label: mw.message( 'wikibasemediainfo-latitude-input-label' ).text(),
			input: this.latitudeInput
		},
		longitude: {
			label: mw.message( 'wikibasemediainfo-longitude-input-label' ).text(),
			input: this.longitudeInput
		},
		precision: {
			label: mw.message( 'wikibasemediainfo-precision-input-label' ).text(),
			input: this.precisionInput
		},
		button: button
	};
};

/**
 * Validate latitude and longitude values.
 *
 * TODO: The max values hardcoded here for latitude and longitude are Earth-
 * specific (e.g. max longitude on Mars is 360). If we ever support multiple
 * globes we will need to update this function to handle them.
 *
 * @param {string} inputType Latitude or longitude
 * @param {string} value
 * @return {boolean}
 */
GlobeCoordinateInputWidget.prototype.validateInput = function ( inputType, value ) {
	var numberValue = Number( value ),
		maxValue = ( inputType === 'latitude' ) ? 90 : 180;

	return value !== '' &&
		!isNaN( numberValue ) &&
		Math.abs( numberValue ) <= maxValue;
};

GlobeCoordinateInputWidget.prototype.onChange = function () {
	// update state to make sure template rerenders
	this.setState( {
		latitude: this.latitudeInput.getValue(),
		longitude: this.longitudeInput.getValue(),
		precision: this.precisionInput.getValue()
	} ).then( this.emit.bind( this, 'change', this ) );
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getRawValue = function () {
	var latitude = this.latitudeInput.getValue(),
		longitude = this.longitudeInput.getValue();

	return latitude + ' ' + longitude;
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getRawValueOptions = function () {
	var precision = Number( this.precisionInput.getValue() );

	return { precision: precision };
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getData = function () {
	var latitude = this.latitudeInput.getValue(),
		longitude = this.longitudeInput.getValue();

	if ( !this.validateInput( 'latitude', latitude ) || !this.validateInput( 'longitude', longitude ) ) {
		throw new Error( 'Invalid coordinate input' );
	}

	return dataValues.newDataValue( 'globecoordinate', {
		latitude: Number( latitude ),
		longitude: Number( longitude ),
		precision: Number( this.precisionInput.getValue() )
	} );
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.setData = function ( data ) {
	var json = data.toJSON();

	this.latitudeInput.setValue( String( json.latitude ) );
	this.longitudeInput.setValue( String( json.longitude ) );
	this.precisionInput.setValue( String( json.precision ) );

	// we're not making any immediate state changes here, but the above
	// `setValue` calls will trigger an onChange event which will update
	// the setState, and this empty state change will make sure we won't
	// resolve until that has happened
	return this.setState( {} );
};

/**
 * Return an array of all available precision values.
 *
 * @return {Array}
 */
GlobeCoordinateInputWidget.prototype.getPrecisions = function () {
	return [
		10,
		1,
		0.1,
		0.01,
		0.001,
		0.0001,
		0.00001,
		0.000001,
		1 / 60,
		1 / 3600,
		1 / 36000,
		1 / 360000,
		1 / 3600000
	];
};

/**
 * Get a language-specific label for a precision value, if one exists.
 *
 * @param {number} precision
 * @return {string}
 */
GlobeCoordinateInputWidget.prototype.getPrecisionLabel = function ( precision ) {
	var label,
		presets = {};

	presets[ mw.message( 'wikibasemediainfo-arcminute-label' ).text() ] = 1 / 60;
	presets[ mw.message( 'wikibasemediainfo-arcsecond-label' ).text() ] = 1 / 3600;
	presets[ mw.message( 'wikibasemediainfo-tenth-of-arcsecond-label' ).text() ] = 1 / 36000;
	presets[ mw.message( 'wikibasemediainfo-hundreth-of-arcsecond-label' ).text() ] = 1 / 360000;
	presets[ mw.message( 'wikibasemediainfo-thousanth-of-arcsecond-label' ).text() ] = 1 / 3600000;

	for ( label in presets ) {
		if ( Math.abs( precision - presets[ label ] ) < 0.000000000001 ) {
			return label;
		}
	}

	return '±' + precision + '°';
};

/**
 * Return options for our precision DropdownInputWidget.
 *
 * @return {Object[]}
 */
GlobeCoordinateInputWidget.prototype.getPrecisionOptions = function () {
	var precisions = this.getPrecisions(),
		precisionValues = [],
		self = this;

	precisions.forEach( function ( precision ) {
		precisionValues.unshift(
			{
				data: precision,
				label: self.getPrecisionLabel( precision )
			}
		);
	} );
	return precisionValues;
};

module.exports = GlobeCoordinateInputWidget;
