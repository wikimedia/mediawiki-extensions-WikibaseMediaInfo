'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	kartoBox,
	kartoEditing,
	GlobeCoordinateInputWidget;

/**
 * Widget that wraps globe-coordinate fields.
 *
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
GlobeCoordinateInputWidget = function MediaInfoStatementsGlobeCoordinateInputWidget( config ) {
	var self = this;

	config = config || {};

	this.state = {
		latitude: null,
		longitude: null,
		// precision will be inferred from input, but can be manually overridden;
		// as soon as it changes manually, the custom precision will be used
		inferredPrecision: null,
		customPrecision: null,
		isQualifier: !!config.isQualifier,
		kartographer: false,
		expanded: false
	};

	this.parseValuePromise = undefined;
	this.debouncedOnChange = OO.ui.debounce( this.onChange.bind( this ), 200 );
	this.onMapClickHandler = this.onMapClick.bind( this );

	this.coordinateInput = new OO.ui.TextInputWidget( {
		classes: [ 'wbmi-input-widget__input' ],
		placeholder: mw.msg( 'wikibasemediainfo-coordinate-input-placeholder' ),
		isRequired: true,
		type: 'string',
		validate: function ( value ) {
			// mark input field as invalid except
			return value === '' || self.hasValidInput();
		}
	} );

	this.precisionInput = new OO.ui.DropdownInputWidget( {
		classes: [ 'wbmi-input-widget__input' ],
		label: mw.msg( 'wikibasemediainfo-select-precision-label' ),
		options: this.getPrecisionOptions(),
		isRequired: true,
		$overlay: true
	} );

	// Set up map element for Kartographer
	this.$map = $( '<div>' ).addClass( 'wbmi-input-widget__map' );
	this.map = undefined;
	this.initializeMap();

	this.bindEventListeners();

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
 * Bind event listeners, including one on the map if using Kartographer
 */
GlobeCoordinateInputWidget.prototype.bindEventListeners = function () {
	var self = this;

	this.coordinateInput.connect( this, { change: this.debouncedOnChange } );
	this.coordinateInput.connect( this, { enter: 'onEnter' } );
	this.precisionInput.connect( this, { change: 'onPrecisionChange' } );
	mw.loader.using( [ 'ext.kartographer.box', 'ext.kartographer.editing' ] )
		.then( function () {
			self.map.on( 'click', self.onMapClickHandler );
		} );
};

/**
 * Unbind event listeners, including one on the map if using Kartographer
 */
GlobeCoordinateInputWidget.prototype.unbindEventListeners = function () {
	var self = this;

	this.coordinateInput.disconnect( this, { change: this.debouncedOnChange } );
	this.coordinateInput.disconnect( this, { enter: 'onEnter' } );
	this.precisionInput.disconnect( this, { change: 'onPrecisionChange' } );

	mw.loader.using( [ 'ext.kartographer.box', 'ext.kartographer.editing' ] )
		.then( function () {
			self.map.off( 'click', self.onMapClickHandler );
		} );
};

/**
 * Set the data of this widget programatically. This method is used to populate
 * qualifier-mode coordinate inputs with pre-existing data.
 *
 * @param {dataValues.DataValue} newData
 * @return {jQuery.Promise}
 */
GlobeCoordinateInputWidget.prototype.setData = function ( newData ) {
	var json = newData.toJSON(),
		self = this,
		existingData;

	try {
		existingData = this.getData();
	} catch ( e ) {
		// no existing data, proceed
	}

	this.unbindEventListeners();
	this.coordinateInput.setValue( json.latitude + ', ' + json.longitude );
	this.precisionInput.setValue( json.precision );
	this.bindEventListeners();

	return this.setState( {
		latitude: json.latitude,
		longitude: json.longitude,
		inferredPrecision: json.precision,
		customPrecision: null,
		expanded: false
	} ).then( function ( $element ) {
		if ( !newData.equals( existingData ) ) {
			self.emit( 'change', self );
		}
		return $element;
	} );
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getData = function () {
	if ( this.state.latitude === null || this.state.longitude === null ) {
		throw new Error( 'No valid coordinate' );
	}

	return dataValues.newDataValue( 'globecoordinate', {
		latitude: this.state.latitude,
		longitude: this.state.longitude,
		precision: this.state.customPrecision || this.state.inferredPrecision
	} );
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getRawValue = function () {
	return this.coordinateInput.getValue();
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getRawValueOptions = function () {
	return {
		precision: this.state.customPrecision || undefined
	};
};

/**
 * @inheritdoc
 */
GlobeCoordinateInputWidget.prototype.clear = function () {
	var layer;

	this.coordinateInput.setValue( '' );
	this.precisionInput.setValue( '' );
	this.coordinateInput.setValidityFlag( true );

	if ( kartoEditing && this.map ) {
		layer = kartoEditing.getKartographerLayer( this.map );
		layer.clearLayers();
	}

	return this.setState( {
		latitude: null,
		longitude: null,
		inferredPrecision: null,
		customPrecision: null,
		expanded: false
	} );
};

/**
 * @param {string} newValue new input value
 */
GlobeCoordinateInputWidget.prototype.onChange = function ( newValue ) {
	var self = this;

	if ( this.parseValuePromise && this.parseValuePromise.abort ) {
		this.parseValuePromise.abort();
	}

	// If user is simply deleting the previous value, no need to parse;
	// Reset values to null and return
	if ( newValue === '' ) {
		this.setState( {
			latitude: null,
			longitude: null,
			inferredPrecision: null
		} ).then( this.emit.bind( this, 'change', this ) );

		return;
	}

	this.parseValuePromise = this.parseValue( undefined, 'globe-coordinate' );
	this.parseValuePromise
		.then( function ( response ) {
			var json = response.toJSON();

			// set the value of the precision dropdown to the inferred precision if
			// no custom precision has been set
			if ( !self.state.customPrecision ) {
				self.unbindEventListeners();
				self.precisionInput.setValue( json.precision );
				self.bindEventListeners();
			}

			self.coordinateInput.setValidityFlag( true );
			self.emit( 'change', self );

			return self.setState( {
				latitude: json.latitude,
				longitude: json.longitude,
				inferredPrecision: json.precision
			} );
		} )
		.catch( function () {
			self.coordinateInput.setValidityFlag( false );
		} );
};

GlobeCoordinateInputWidget.prototype.onPrecisionChange = function () {
	this.setState( {
		customPrecision: Number( this.precisionInput.getValue() )
	} ).then( this.emit.bind( this, 'change', this ) );
};

GlobeCoordinateInputWidget.prototype.onEnter = function () {
	if ( this.hasValidInput() ) {
		this.emit( 'add', this );
	}
};

GlobeCoordinateInputWidget.prototype.onExpandClick = function () {
	// Toggle the map visibility
	this.setState( { expanded: !( this.state.expanded ) } );
};

/**
 * @param {Object} e event
 */
GlobeCoordinateInputWidget.prototype.onMapClick = function ( e ) {
	var coordinates = this.map.mouseEventToLatLng( e.originalEvent ),
		precision = this.constructor.zoomToPrecision( this.map.getZoom(), coordinates.lat ),
		meaningfulDigits = this.constructor.precisionToDigits( precision ),
		lat = coordinates.lat.toFixed( meaningfulDigits ),
		lng = coordinates.lng.toFixed( meaningfulDigits ),
		latLngStr = lat + ', ' + lng;

	this.unbindEventListeners();
	this.coordinateInput.setValue( latLngStr );
	this.precisionInput.setValue( String( precision ) );
	this.bindEventListeners();

	this.coordinateInput.setValidityFlag( true );

	this.setState( {
		latitude: parseFloat( lat ),
		longitude: parseFloat( lng ),
		inferredPrecision: precision
	} ).then( this.emit.bind( this, 'change', this ) );
};

/**
 * @return {boolean}
 */
GlobeCoordinateInputWidget.prototype.hasValidInput = function () {
	try {
		this.getData();
		return true;
	} catch ( e ) {
		return false;
	}
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.getTemplateData = function () {
	var submitButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-input-widget__button' ],
			label: mw.msg( 'wikibasemediainfo-globecoordinate-input-button-text' ),
			flags: [ 'progressive' ],
			disabled: !this.hasValidInput()
		} ),
		expandButton = new OO.ui.ToggleButtonWidget( {
			classes: [
				'wbmi-input-widget__button',
				'wbmi-input-widget__button--map-expand'
			],
			label: mw.msg( 'wikibasemediainfo-globecoordinate-map-button-text' ),
			framed: true,
			icon: 'mapPin',
			value: this.state.expanded
		} );

	submitButton.connect( this, { click: [ 'emit', 'add', this ] } );
	expandButton.connect( this, { click: 'onExpandClick' } );

	return {
		isQualifier: this.state.isQualifier,
		coordinates: {
			label: mw.msg( 'wikibasemediainfo-coordinate-input-label' ),
			input: this.coordinateInput
		},
		precision: {
			label: mw.msg( 'wikibasemediainfo-precision-input-label' ),
			input: this.precisionInput
		},
		submitButton: submitButton,
		expandButton: expandButton,
		expanded: this.state.expanded,
		kartographer: this.state.kartographer,
		map: this.$map
	};
};

/**
 * @inheritDoc
 */
GlobeCoordinateInputWidget.prototype.render = function () {
	var self = this;

	return ComponentWidget.prototype.render.call( this ).then( function ( $element ) {
		var layer, data;

		if ( self.map === undefined || kartoEditing === undefined ) {
			return $element;
		}

		// after having re-rendered our DOM, let's also update the marker on our map
		// to reflect the current state
		layer = kartoEditing.getKartographerLayer( self.map );

		try {
			data = self.getData().getValue();

			layer.setGeoJSON( {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Point',
					coordinates: [
						data.getLongitude(),
						data.getLatitude()
					]
				}
			} );

			/* eslint-disable no-undef */
			self.map.setView(
				L.latLng( data.getLatitude(), data.getLongitude() ),
				self.constructor.precisionToZoom( data.getPrecision(), data.getLatitude() )
			);
			/* eslint-enable no-undef */
		} catch ( e ) {
			// no valid location at this point...
			layer.clearLayers();
		}

		return $element;
	} );
};

/**
 * @return {jQuery.Promise}
 */
GlobeCoordinateInputWidget.prototype.initializeMap = function () {
	var self = this;

	if ( this.map ) {
		// map already initialized previously
		return this.setState( {} );
	}

	return mw.loader.using( [ 'ext.kartographer.box', 'ext.kartographer.editing' ] )
		.then( function ( require ) {
			kartoBox = require( 'ext.kartographer.box' );
			kartoEditing = require( 'ext.kartographer.editing' );

			self.map = kartoBox.map( {
				container: self.$map[ 0 ],
				center: [ 20, 0 ],
				zoom: 2,
				allowFullScreen: false,
				// Prevent users from entering weird values like 40 N, 250 E by picking
				// on the map. If users manually enter such values we will allow it
				// (wikidata considers it valid) and ItemWidget's map will do its best
				// to display such values; enforcing bounds on the map used for input
				// should make it harder for such values to be entered accidentally.
				maxBounds: [
					[ 90, -180 ],
					[ -90, 180 ]
				],
				minZoom: 1
			} );

			// because the map node we'll be attaching this map to has not yet been
			// added to the DOM, it won't know what size it needs to initialize with...
			// we'll listen for DOM changes and when we discover this node getting
			// added, we'll invalidate its existing (incorrect) size
			new MutationObserver( function () {
				if ( self.$map.parents( 'body' ).length > 0 ) {
					self.map.invalidateSize();

					// note: we're not going to disconnect the observer, because
					// toggling read & edit mode is going to repeatedly attach/detach
					// the map from DOM, causing the same thing over and over
				}
			} ).observe( document, { childList: true, subtree: true } );

			self.setState( { kartographer: true } );
		} );
};

/**
 * @inheritdoc
 */
GlobeCoordinateInputWidget.prototype.focus = function () {
	this.coordinateInput.focus();
};

/**
 * @inheritdoc
 */
GlobeCoordinateInputWidget.prototype.setDisabled = function ( disabled ) {
	this.coordinateInput.setDisabled( disabled );
	this.precisionInput.setDisabled( disabled );
	ComponentWidget.prototype.setDisabled.call( this, disabled );
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

	presets[ mw.msg( 'wikibasemediainfo-arcminute-label' ) ] = 1 / 60;
	presets[ mw.msg( 'wikibasemediainfo-arcsecond-label' ) ] = 1 / 3600;
	presets[ mw.msg( 'wikibasemediainfo-tenth-of-arcsecond-label' ) ] = 1 / 36000;
	presets[ mw.msg( 'wikibasemediainfo-hundreth-of-arcsecond-label' ) ] = 1 / 360000;
	presets[ mw.msg( 'wikibasemediainfo-thousanth-of-arcsecond-label' ) ] = 1 / 3600000;

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
	var precisions = this.constructor.getPrecisions(),
		precisionValues = [],
		self = this;

	precisions.forEach( function ( precision ) {
		precisionValues.unshift( {
			data: precision,
			label: self.getPrecisionLabel( precision )
		} );
	} );
	return precisionValues;
};

/**
 * Return an array of all available precision values.
 *
 * @return {Array}
 */
GlobeCoordinateInputWidget.getPrecisions = function () {
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
 * Given a latitude & zoom level, this will figure out the precision.
 *
 * When the map is zoomed out, the coordinate that's being selected will be
 * a lot less precise than when it's zoomed in. We can determine the maximum
 * precision and use that value to prefill the precision value, because most
 * average users won't really know what those values mean anyway...
 *
 * @see https://groups.google.com/d/msg/google-maps-js-api-v3/hDRO4oHVSeM/osOYQYXg2oUJ
 *
 * @param {number} zoom
 * @param {number} latitude
 * @return {number}
 */
GlobeCoordinateInputWidget.zoomToPrecision = function ( zoom, latitude ) {
	var precisions = this.getPrecisions(),
		metersPerPx = ( 156543.03392 * Math.cos( ( latitude * Math.PI ) / 180 ) ) / Math.pow( 2, zoom ),
		// 111.32m = 1 degree at equator, then corrected for latitude
		degrees = metersPerPx / ( 111.32 * 1000 * Math.cos( latitude * ( Math.PI / 180 ) ) );

	// find closest match for the actual precision
	return precisions.reduce( function ( best, value ) {
		return Math.abs( value - degrees ) < Math.abs( best - degrees ) ? value : best;
	}, Math.max.apply( null, precisions ) );
};

/**
 * Given a precision (e.g. 0.001), this will return the amount of digits
 * that are still meaningful (e.g. 3 digits) for that precision.
 *
 * E.g. 50.131224596772 makes no sense with a precision of 0.1 - there just
 * isn't enough precision and we might as well round to 50.1 immediately.
 *
 * @param {number} precision
 * @return {number}
 */
GlobeCoordinateInputWidget.precisionToDigits = function ( precision ) {
	var digits = -1,
		previous;

	do {
		previous = precision;
		digits++;
		precision %= Math.pow( 1 / 10, digits );
	} while ( previous === precision );

	return digits;
};

/**
 * Given a latitude & precision, this will figure out the zoom level.
 *
 * @see https://groups.google.com/d/msg/google-maps-js-api-v3/hDRO4oHVSeM/osOYQYXg2oUJ
 *
 * @param {number} precision
 * @param {number} latitude
 * @return {number}
 */
GlobeCoordinateInputWidget.precisionToZoom = function ( precision, latitude ) {
	// 111.32m = 1 degree at equator, then corrected for latitude
	var metersPerPx = precision * ( 111.32 * 1000 * Math.cos( latitude * ( Math.PI / 180 ) ) ),
		zoom = Math.log( ( 156543.03392 * Math.cos( ( latitude * Math.PI ) / 180 ) ) / metersPerPx ) / Math.log( 2 );

	return Math.round( zoom );
};

module.exports = GlobeCoordinateInputWidget;
