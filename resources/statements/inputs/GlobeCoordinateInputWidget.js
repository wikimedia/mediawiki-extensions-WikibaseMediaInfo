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
		latitude: '',
		longitude: '',
		precision: '',
		isQualifier: !!config.isQualifier,
		expanded: false,
		kartographer: false
	};

	this.latitudeInput = new OO.ui.TextInputWidget( {
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true,
		type: 'number',
		validate: this.validateInput.bind( this, 'latitude' ),
		placeholder: mw.message( 'wikibasemediainfo-latitude-input-label' ).text()
	} );

	this.longitudeInput = new OO.ui.TextInputWidget( {
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true,
		type: 'number',
		validate: this.validateInput.bind( this, 'longitude' ),
		placeholder: mw.message( 'wikibasemediainfo-longitude-input-label' ).text()
	} );

	this.precisionInput = new OO.ui.DropdownInputWidget( {
		classes: [ 'wbmi-input-widget__input' ],
		options: this.getPrecisionOptions(),
		$overlay: true
	} );

	this.latitudeInput.connect( this, { change: 'onChange' } );
	this.longitudeInput.connect( this, { change: 'onChange' } );
	this.precisionInput.connect( this, { change: 'onChange' } );

	// we can create the map node already, but until we've successfully loaded
	// kartographer, we can't wire up the mapping functionality
	this.$map = $( '<div>' ).addClass( 'wbmi-input-widget__map' );
	this.map = undefined;
	mw.loader.using( [ 'ext.kartographer.box', 'ext.kartographer.editing' ] )
		.then( function ( require ) {
			kartoBox = require( 'ext.kartographer.box' );
			kartoEditing = require( 'ext.kartographer.editing' );

			// soft dependency loaded! now wire up mapping functionality
			self.map = self.initializeMap( self.$map );
			self.map.on( 'click', self.onMapClick.bind( self ) );

			self.setState( { kartographer: true } );
		} );

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
	var submitButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-input-widget__button' ],
			label: mw.message( 'wikibasemediainfo-globecoordinate-input-button-text' ).text(),
			flags: [ 'primary', 'progressive' ],
			disabled:
				this.latitudeInput.getValue() === '' ||
				this.longitudeInput.getValue() === '' ||
				this.precisionInput.getValue() === ''
		} ),
		expandButton = new OO.ui.ButtonWidget( {
			classes: [
				'wbmi-input-widget__button',
				'wbmi-input-widget__button--map-expand'
			],
			label: mw.message( 'wikibasemediainfo-globecoordinate-map-button-text' ).text(),
			framed: true,
			icon: 'mapPin'
		} );

	submitButton.connect( this, { click: [ 'emit', 'add', this ] } );
	expandButton.connect( this, { click: 'onExpandClick' } );

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

		if ( self.map === undefined ) {
			return $element;
		}

		// after having re-rendered our DOM, let's also update the marker on our map
		// to reflect the current state
		layer = kartoEditing.getKartographerLayer( self.map );

		try {
			data = self.getData();
			layer.setGeoJSON( {
				type: 'Feature',
				properties: {},
				geometry: {
					type: 'Point',
					coordinates: [
						data.getValue().getLongitude(),
						data.getValue().getLatitude()
					]
				}
			} );
		} catch ( e ) {
			// no valid location at this point...
			layer.clearLayers();
		}

		return $element;
	} );
};

GlobeCoordinateInputWidget.prototype.initializeMap = function ( $element ) {
	var map = kartoBox.map( {
		container: $element[ 0 ],
		center: [ 20, 0 ],
		zoom: 2,
		allowFullScreen: false,
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
		if ( $element.parents( 'body' ).length > 0 ) {
			map.invalidateSize();

			// note: we're not going to disconnect the observer, because
			// toggling read & edit mode is going to repeatedly attach/detach
			// the map from DOM, causing the same thing over and over
		}
	} ).observe( document, { childList: true, subtree: true } );

	return map;
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
	var self = this;

	// update state to make sure template rerenders
	this.setState( {
		latitude: this.latitudeInput.getValue(),
		longitude: this.longitudeInput.getValue(),
		precision: this.precisionInput.getValue()
	} ).then( function () {
		self.emit( 'change', self );
	} );
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

	if ( !this.validateInput( 'latitude', latitude ) ||
		!this.validateInput( 'longitude', longitude ) ) {
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
		precisionValues.unshift( {
			data: precision,
			label: self.getPrecisionLabel( precision )
		} );
	} );
	return precisionValues;
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
GlobeCoordinateInputWidget.prototype.zoomToPrecision = function ( zoom, latitude ) {
	var precisions = this.getPrecisions(),
		metersPerPx = ( 156543.03392 * Math.cos( ( latitude * Math.PI ) / 180 ) ) / Math.pow( 2, zoom ),
		// 111.32m = 1 degree at equator, then corrected for latitude
		degrees = metersPerPx / ( 111.32 * 1000 * Math.cos( latitude * ( Math.PI / 180 ) ) );

	// find closest match for the actual precision
	return precisions.reduce( function ( best, value ) {
		return Math.abs( value - degrees ) < Math.abs( best - degrees ) ? value : best;
	}, Math.max.apply( null, precisions ) );
};

GlobeCoordinateInputWidget.prototype.onExpandClick = function () {
	this.latitudeInput.$input.attr(
		'placeholder',
		mw.message( 'wikibasemediainfo-latitude-input-placeholder' ).text()
	);
	this.longitudeInput.$input.attr(
		'placeholder',
		mw.message( 'wikibasemediainfo-longitude-input-placeholder' ).text()
	);
	this.setState( { expanded: true } );
};

/**
 * @param {Object} e
 */
GlobeCoordinateInputWidget.prototype.onMapClick = function ( e ) {
	var coordinates = this.map.mouseEventToLatLng( e.originalEvent );

	this.latitudeInput.setValue( String( coordinates.lat ) );
	this.longitudeInput.setValue( String( coordinates.lng ) );
	this.precisionInput.setValue( String(
		this.zoomToPrecision( this.map.getZoom(), coordinates.lat )
	) );
};

module.exports = GlobeCoordinateInputWidget;
