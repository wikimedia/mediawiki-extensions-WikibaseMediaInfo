'use strict';

/**
 * @constructor
 * @param {Object} config Configuration options
 * @param {Object} config.qualifiers Qualifiers map: { propertyId: datatype, ...}
 * @param {string} config.entityId Entity ID (e.g. M123)
 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
 * @param {string} [config.guid] GUID of existing statement, or null for new
 * @param {number} [config.rank] One of datamodel.Statement.RANK.*
 * @param {string} [config.snakType] value, somevalue, or novalue
 * @param {dataValues.DataValue} [config.dataValue] Relevant DataValue object, or null for valueless
 * @param {string} [config.editing] True for edit mode, False for read mode
 */
var DATA_TYPES,
	QualifierWidget = require( './QualifierWidget.js' ),
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	DOMLessGroupWidget = require( 'wikibase.mediainfo.base' ).DOMLessGroupWidget,
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	GlobeCoordinateInputWidget = require( './inputs/GlobeCoordinateInputWidget.js' ),
	datamodel = require( 'wikibase.datamodel' ),
	valueTypes = {
		VALUE: datamodel.PropertyValueSnak.TYPE,
		SOMEVALUE: datamodel.PropertySomeValueSnak.TYPE,
		NOVALUE: datamodel.PropertyNoValueSnak.TYPE
	},
	kartoBox,
	kartoEditing,
	ItemWidget;

/**
 * Enum for data types that have special display requirements.
 */
DATA_TYPES = {
	GLOBECOORDINATE: 'globecoordinate'
};

/**
 * @param {Object} config Configuration options
 */
ItemWidget = function MediaInfoStatementsItemWidget( config ) {
	config = config || {};

	this.guidGenerator = new wikibase.utilities.ClaimGuidGenerator( config.entityId );

	// set these first - the parent constructor could call other methods
	// (e.g. setDisabled) which may cause a re-render, and will need
	// some of these...
	this.state = {
		editing: !!config.editing,
		propertyId: config.propertyId,
		guid: config.guid || this.guidGenerator.newGuid(),
		rank: config.rank || datamodel.Statement.RANK.NORMAL,
		snakType: config.snakType || valueTypes.NOVALUE,
		dataValue: config.dataValue || null,
		kartographer: false
	};

	// Coordinate values are displayed with an additional element, an interactive map;
	// Determine if we are dealing with one and initialize the map UI here if so.
	// Attempt to load Kartographer dependencies if we are dealing with coordinates
	this.$map = $( '<div>' ).addClass( 'wbmi-item__map' );
	this.map = undefined;
	this.initializeMap();

	ItemWidget.parent.call( this, $.extend( {}, config ) );
	DOMLessGroupWidget.call( this, $.extend( {}, config ) );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/ItemWidget.mustache+dom'
	);
	FormatValueElement.call( this, $.extend( {}, config ) );
};

OO.inheritClass( ItemWidget, OO.ui.Widget );
OO.mixinClass( ItemWidget, DOMLessGroupWidget );
OO.mixinClass( ItemWidget, ComponentWidget );
OO.mixinClass( ItemWidget, FormatValueElement );

/**
 * @inheritDoc
 */
ItemWidget.prototype.getTemplateData = function () {
	var self = this,
		labelPromise,
		labelMessage,
		errors = this.getErrors(),
		errorMessages = ( errors.length > 0 ) ?
			errors.map( function ( error ) {
				return new OO.ui.MessageWidget( {
					type: 'error',
					label: error,
					classes: [ 'wbmi-statement-error-msg--inline' ]
				} );
			} ) : null;

	// Get the formatted label text for the value if necessary,
	// or else use a dummy promise
	// Determine if we are dealing with a globecoordinate value, which has
	// special display needs
	if ( this.state.dataValue ) {
		labelPromise = this.formatValue( this.state.dataValue, 'text/html', null, this.state.propertyId );
	} else {
		labelMessage = this.state.snakType === valueTypes.SOMEVALUE ?
			'wikibasemediainfo-filepage-statement-some-value' :
			'wikibasemediainfo-filepage-statement-no-value';
		labelPromise = $.Deferred().resolve( mw.message( labelMessage ).parse() ).promise();
	}

	return labelPromise.then( function ( label ) {
		var id = self.dataValue ? self.dataValue.toJSON().id : '',
			prominent = self.state.rank === datamodel.Statement.RANK.PREFERRED,
			dataValueType = self.state.dataValue ? self.state.dataValue.getType() : undefined,
			removeButton,
			addQualifierButton,
			formatResponse;

		formatResponse = function ( html ) {
			return $( '<div>' )
				.append( html )
				.find( 'a' )
				.attr( 'target', '_blank' )
				.end()
				.html();
		};

		removeButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-remove' ],
			title: mw.message( 'wikibasemediainfo-statements-item-remove' ).text(),
			flags: 'destructive',
			icon: 'trash',
			framed: false
		} );
		removeButton.connect( self, { click: [ 'emit', 'delete' ] } );

		addQualifierButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-qualifier-add' ],
			label: mw.message( 'wikibasemediainfo-statements-item-add-qualifier' ).text(),
			flags: 'progressive',
			framed: false
		} );
		addQualifierButton.connect( self, { click: [ 'addQualifier' ] } );

		return {
			errors: errorMessages,
			editing: self.state.editing,
			qualifiers: self.getItems(),
			label: formatResponse( label ),
			id: id.replace( /^.+:/, '' ),
			prominent: prominent,
			prominenceMessage: prominent ?
				mw.message( 'wikibasemediainfo-statements-item-is-prominent' ).text() :
				mw.message( 'wikibasemediainfo-statements-item-mark-as-prominent' ).text(),
			prominenceToggleHandler: self.toggleItemProminence.bind( self ),
			removeButton: removeButton,
			addQualifierButton: addQualifierButton,
			isGlobecoordinate: dataValueType === DATA_TYPES.GLOBECOORDINATE,
			kartographer: self.state.kartographer,
			map: self.$map
		};
	} );
};

ItemWidget.prototype.render = function () {
	var self = this,
		promise = ComponentWidget.prototype.render.call( this );

	if (
		this.map &&
		this.state.dataValue &&
		this.state.dataValue.getType() === DATA_TYPES.GLOBECOORDINATE
	) {
		promise = promise.then( function ( $element ) {
			var data = self.state.dataValue.getValue(),
				layer = kartoEditing.getKartographerLayer( self.map );

			// we've just rerendered & DOM might look different then it did
			// before, when the map size was initially calculated
			self.map.invalidateSize();

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
				GlobeCoordinateInputWidget.precisionToZoom( data.getPrecision(), data.getLatitude() )
			);
			/* eslint-enable no-undef */

			return $element;
		} );
	}

	return promise;
};

/**
 * @param {Object} event
 * @return {jQuery.Promise}
 */
ItemWidget.prototype.toggleItemProminence = function ( event ) {
	event.preventDefault();

	if ( this.isDisabled() ) {
		return $.Deferred().resolve( this.$element ).promise();
	}

	return this.setState( {
		rank: this.state.rank === datamodel.Statement.RANK.PREFERRED ?
			datamodel.Statement.RANK.NORMAL :
			datamodel.Statement.RANK.PREFERRED
	} ).then( this.emit.bind( this, 'change' ) );
};

/**
 * @param {datamodel.Snak|undefined} [data]
 * @return {QualifierWidget}
 */
ItemWidget.prototype.createQualifier = function ( data ) {
	var widget = new QualifierWidget( { editing: this.state.editing } );

	if ( data ) {
		widget.setData( data );
	}

	widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
	widget.connect( this, { delete: [ 'emit', 'change' ] } );
	widget.connect( this, { change: [ 'emit', 'change' ] } );

	return widget;
};

/**
 * @param {datamodel.Snak|undefined} data
 */
ItemWidget.prototype.addQualifier = function ( data ) {
	var widget = this.createQualifier( data );
	this.addItems( [ widget ] );
	this.emit( 'change' );
	this.render().then( widget.focus.bind( widget ) );
};

/**
 * @param {boolean} editing
 * @return {jQuery.Promise}
 */
ItemWidget.prototype.setEditing = function ( editing ) {
	var promises = this.getItems().map( function ( widget ) {
		return widget.setEditing( editing );
	} );

	return $.when.apply( $, promises ).then( this.setState.bind( this, { editing: editing } ) );
};

/**
 * @return {datamodel.Statement}
 */
ItemWidget.prototype.getData = function () {
	var snak;

	switch ( this.state.snakType ) {
		case valueTypes.SOMEVALUE:
			snak = new datamodel.PropertySomeValueSnak( this.state.propertyId );
			break;
		case valueTypes.NOVALUE:
			snak = new datamodel.PropertyNoValueSnak( this.state.propertyId );
			break;
		default:
			snak = this.state.dataValue ?
				new datamodel.PropertyValueSnak( this.state.propertyId, this.state.dataValue, null ) :
				new datamodel.PropertyNoValueSnak( this.state.propertyId );
			break;
	}

	return new datamodel.Statement(
		new datamodel.Claim(
			snak,
			new datamodel.SnakList( this.getItems()
				.map( function ( item ) {
					// try to fetch data - if it fails (likely because of incomplete input),
					// we'll just ignore that qualifier
					try {
						return item.getData();
					} catch ( e ) {
						return undefined;
					}
				} )
				.filter( function ( data ) {
					return data instanceof datamodel.Snak;
				} )
			),
			this.state.guid
		),
		null,
		this.state.rank
	);
};

/**
 * @param {datamodel.Statement} data
 * @return {jQuery.Deferred}
 */
ItemWidget.prototype.setData = function ( data ) {
	var self = this,
		existing = {},
		promises = [],
		claim,
		mainSnak,
		qualifiers,
		type;

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof datamodel.Statement ) ) {
		throw new Error( 'Invalid statement' );
	}

	// Store the attributes we need to reference frequently for later use
	claim = data.getClaim();
	mainSnak = claim.getMainSnak();
	qualifiers = claim.getQualifiers();
	type = mainSnak.getType();

	// get rid of existing widgets that are no longer present in the
	// new set of data we've been fed (or are in an invalid state)
	this.removeItems( this.getItems().filter( function ( item ) {
		var qualifier;
		try {
			qualifier = item.getData();
		} catch ( e ) {
			// failed to fetch data (likely because of incomplete input),
			// so we should remove this qualifier...
			return true;
		}
		return !qualifiers.hasItem( qualifier );
	} ) );

	// figure out which items have an existing widget already
	// we're doing this outside of the creation below, because
	// setData is async, and new objects may not immediately
	// have their data set
	qualifiers.each( function ( i, qualifier ) {
		existing[ i ] = self.findItemFromData( qualifier );
	} );

	// add new qualifiers that don't already exist
	qualifiers.each( function ( i, qualifier ) {
		var widget;

		// TODO: Remove this to support somevalue and novalue qualifiers. For
		// now, we'll ignore them.
		if ( !( qualifier instanceof datamodel.PropertyValueSnak ) ) {
			return false;
		}

		widget = existing[ i ];
		if ( widget !== null ) {
			self.moveItem( widget, i );
		} else {
			widget = self.createQualifier();
			self.insertItem( widget, i );
		}
		promises.push( widget.setData( qualifier ) );
	} );

	return $.when.apply( $, promises )
		.then( this.setState.bind( this, {
			propertyId: mainSnak.getPropertyId(),
			guid: claim.getGuid() || this.guidGenerator.newGuid(),
			rank: data.getRank(),
			snakType: type,
			dataValue: type === valueTypes.VALUE ? mainSnak.getValue() : null,
			// if new data was passed in, error is no longer valid
			errors: data.equals( this.getData() ) ? this.getErrors() : []
		} ) )
		.then( this.initializeMap.bind( this ) );
};

/**
 * @return {jQuery.Promise}
 */
ItemWidget.prototype.initializeMap = function () {
	var self = this;

	if (
		// map already initialized previously
		this.map ||
		// not a geocoordinate datavalue = no map needed
		!this.state.dataValue ||
		this.state.dataValue.getType() !== DATA_TYPES.GLOBECOORDINATE
	) {
		return this.setState( {} );
	}

	return mw.loader.using( [ 'ext.kartographer.box', 'ext.kartographer.editing' ] )
		.then( function ( require ) {
			var sdTab;

			kartoBox = require( 'ext.kartographer.box' );
			kartoEditing = require( 'ext.kartographer.editing' );

			// Unlike in the GlobeCoordinateInputWidget, the ItemWidget's map does not
			// enforce maxBounds. This is because Wikidata allows users to input
			// coordinates like 40N, 250E; if a user has entered such a value manually,
			// let's do our best to display it. Leaflet will just wrap around the
			// virtual "globe" to display the marker.
			self.map = kartoBox.map( {
				container: self.$map[ 0 ],
				center: [ 20, 0 ],
				zoom: 2,
				allowFullScreen: false,
				minZoom: 1
			} );

			// Because maps within ItemWidgets need to be immediately visible in "read
			// mode", we need a MutationObserver which can watch for when the structured
			// data tab (which is hidden by default) becomes visible so that the map can
			// be forced to recalculate its size. Leaflet cannot correctly determine
			// the size of the map when it is initialized on a hidden element (like
			// the children of a non-visible tab), so we must do it again when the map
			// becomes visible.
			// eslint-disable-next-line no-jquery/no-global-selector
			sdTab = $( '.wbmi-structured-data-header' ).closest( '.wbmi-tab' )[ 0 ];
			new MutationObserver( function () {
				if ( self.$map.parents( 'body' ).length > 0 ) {
					self.map.invalidateSize();
				}
			} ).observe( sdTab, {
				attributes: true,
				attributeFilter: [ 'aria-hidden' ]
			} );

			return self.setState( { kartographer: true } );
		} );
};

module.exports = ItemWidget;
