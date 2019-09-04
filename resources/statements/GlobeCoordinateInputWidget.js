'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	GlobeCoordinateInputWidget;

/**
 * Widget that wraps globe-coordinate fields.
 */
GlobeCoordinateInputWidget = function MediaInfoStatementsGlobeCoordinateInputWidget() {
	GlobeCoordinateInputWidget.parent.call( this );

	this.latitudeInput = new OO.ui.TextInputWidget( $.extend( {
		classes: [],
		isRequired: true,
		type: 'number',
		validate: this.validateInput.bind( this ),
		placeholder: mw.message( 'wikibasemediainfo-latitude-input-placeholder' ).text()
	} ) );

	this.longitudeInput = new OO.ui.TextInputWidget( $.extend( {
		classes: [],
		isRequired: true,
		type: 'number',
		validate: this.validateInput.bind( this ),
		placeholder: mw.message( 'wikibasemediainfo-longitude-input-placeholder' ).text()
	} ) );

	this.precisionInput = new OO.ui.DropdownInputWidget( $.extend( {
		options: this.getPrecisionOptions()
	} ) );

	this.latitudeInput.connect( this, { change: [ 'emit', 'change' ] } );
	this.longitudeInput.connect( this, { change: [ 'emit', 'change' ] } );
	this.precisionInput.connect( this, { change: [ 'emit', 'change' ] } );

	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/GlobeCoordinateInputWidget.mustache+dom'
	);
};
OO.inheritClass( GlobeCoordinateInputWidget, OO.ui.Widget );
OO.mixinClass( GlobeCoordinateInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getTemplateData = function () {
	return {
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
		}
	};
};

/**
 * Validate latitude and longitude values.
 *
 * TODO: The max values hardcoded here for latitude and longitude are Earth-
 * specific (e.g. max longitude on Mars is 360). If we ever support multiple
 * globes we will need to update this function to handle them.
 *
 * @param {string} value
 * @param {string} inputType Latitude or longitude
 * @return {boolean}
 */
GlobeCoordinateInputWidget.prototype.validateInput = function ( value, inputType ) {
	var numberValue = Number( value ),
		maxValue = ( inputType === 'latitude' ) ? 90 : 180;

	return value !== '' &&
		!isNaN( numberValue ) &&
		Math.abs( numberValue ) <= maxValue;
};

/**
 * Get globe coordinate data.
 *
 * @return {Object}
 */
GlobeCoordinateInputWidget.prototype.getData = function () {
	var latitude = this.latitudeInput.getValue(),
		longitude = this.longitudeInput.getValue();

	if ( !this.validateInput( latitude, 'latitude' ) || !this.validateInput( longitude, 'longitude' ) ) {
		throw new Error( 'Invalid coordinate input' );
	}

	return {
		latitude: Number( latitude ),
		longitude: Number( longitude ),
		precision: Number( this.precisionInput.getValue() )
	};
};

/**
 * Set field values based on GlobeCoordinate object passed down by parent.
 *
 * @param {GlobeCoordinate} data
 * @return {jQuery.Promise}
 */
GlobeCoordinateInputWidget.prototype.setData = function ( data ) {
	var values = data.toJSON();

	this.latitudeInput.setValue( values.latitude );
	this.longitudeInput.setValue( values.longitude );
	this.precisionInput.setValue( values.precision );

	return $.Deferred().resolve( this.$element ).promise();
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
