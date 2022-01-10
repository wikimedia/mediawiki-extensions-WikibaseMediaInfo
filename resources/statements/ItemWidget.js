'use strict';

/**
 * @constructor
 * @param {Object} config Configuration options
 * @param {string} config.entityId Entity ID (e.g. M123)
 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
 * @param {string} [config.guid] GUID of existing statement, or null for new
 * @param {number} [config.rank] One of datamodel.Statement.RANK.*
 * @param {string} [config.snakType] value, somevalue, or novalue
 * @param {dataValues.DataValue} [config.dataValue] Relevant DataValue object, or null for valueless
 * @param {string} [config.editing] True for edit mode, False for read mode
 */
var DATA_TYPES,
	SnakListWidget = require( './SnakListWidget.js' ),
	ConstraintsReportHandlerElement = require( './ConstraintsReportHandlerElement.js' ),
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
	// NOTE: when the need arises to put more datatype-specific logic
	// in here, consider refactoring this similar to the input fields
};

/**
 * @param {Object} config Configuration options
 */
ItemWidget = function MediaInfoStatementsItemWidget( config ) {
	this.config = $.extend( { editing: false }, config );

	this.guidGenerator = new wikibase.utilities.ClaimGuidGenerator( config.entityId );

	this.qualifiers = this.createSnaklistWidget( {
		addText: mw.msg( 'wikibasemediainfo-statements-item-add-qualifier' )
	} );

	// set these first - the parent constructor could call other methods
	// (e.g. setDisabled) which may cause a re-render, and will need
	// some of these...
	this.state = {
		editing: this.config.editing,
		propertyId: this.config.propertyId,
		guid: this.config.guid || this.guidGenerator.newGuid(),
		rank: this.config.rank || datamodel.Statement.RANK.NORMAL,
		snakType: this.config.snakType || valueTypes.NOVALUE,
		dataValue: this.config.dataValue || null,
		references: [],
		referenceHashes: [],
		kartographer: false,
		constraintsReport: null
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
	ConstraintsReportHandlerElement.call( this, $.extend( {}, config ) );
};

OO.inheritClass( ItemWidget, OO.ui.Widget );
OO.mixinClass( ItemWidget, DOMLessGroupWidget );
OO.mixinClass( ItemWidget, ComponentWidget );
OO.mixinClass( ItemWidget, FormatValueElement );
OO.mixinClass( ItemWidget, ConstraintsReportHandlerElement );

/**
 * @inheritDoc
 */
ItemWidget.prototype.getTemplateData = function () {
	var self = this,
		labelPromise,
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
		labelPromise = $.Deferred().resolve(
			mw.message(
				this.state.snakType === valueTypes.SOMEVALUE ?
					'wikibasemediainfo-filepage-statement-some-value' :
					'wikibasemediainfo-filepage-statement-no-value'
			).parse()
		).promise();
	}

	return labelPromise.then( function ( label ) {
		var id = self.dataValue ? self.dataValue.toJSON().id : '',
			prominent = self.state.rank === datamodel.Statement.RANK.PREFERRED,
			dataValueType = self.state.dataValue ? self.state.dataValue.getType() : undefined,
			removeButton,
			addReferenceButton,
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
			title: mw.msg( 'wikibasemediainfo-statements-item-remove' ),
			flags: 'destructive',
			icon: 'trash',
			framed: false
		} );
		removeButton.connect( self, { click: [ 'emit', 'delete' ] } );

		addReferenceButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-snaklist-add-snak' ],
			label: mw.msg( 'wikibasemediainfo-statements-item-add-reference' ),
			flags: 'progressive',
			framed: false
		} );
		addReferenceButton.on( 'click', function () {
			var widget = self.createReferenceWidget();
			// initialize with an empty snak input
			widget.addWidget();
			self.setState( {
				references: self.state.references.concat( widget ),
				referenceHashes: self.state.referenceHashes.concat( null )
			} );
		} );

		return {
			errors: errorMessages,
			editing: self.state.editing,
			qualifiersTitle: mw.msg( 'wikibasemediainfo-statements-item-qualifiers' ),
			qualifiers: self.qualifiers,
			referencesTitle: mw.msg( 'wikibasemediainfo-statements-item-references' ),
			referenceTitle: mw.msg( 'wikibasemediainfo-statements-item-reference' ),
			addReferenceButton: addReferenceButton,
			references: self.state.references,
			label: formatResponse( label ),
			id: id.replace( /^.+:/, '' ),
			disabled: self.isDisabled(),
			prominent: prominent,
			prominenceMessage: prominent ?
				mw.msg( 'wikibasemediainfo-statements-item-is-prominent' ) :
				mw.msg( 'wikibasemediainfo-statements-item-mark-as-prominent' ),
			prominenceToggleHandler: self.toggleItemProminence.bind( self ),
			removeButton: removeButton,
			isGlobecoordinate: dataValueType === DATA_TYPES.GLOBECOORDINATE,
			kartographer: self.state.kartographer,
			map: self.$map,
			constraintsReport: self.state.constraintsReport &&
				self.popupFromResults( self.state.constraintsReport )
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
 * @param {boolean} editing
 * @return {jQuery.Promise}
 */
ItemWidget.prototype.setEditing = function ( editing ) {
	var self = this;

	return $.Deferred().resolve().promise()
		.then( this.qualifiers.setEditing.bind( this.qualifiers, editing ) )
		.then( function () {
			var promises = self.state.references.map( function ( reference ) {
				return reference.setEditing( editing );
			} );
			return $.when.apply( $, promises );
		} )
		.then( this.setState.bind( this, { editing: editing } ) );
};

/**
 * @return {datamodel.Statement}
 */
ItemWidget.prototype.getData = function () {
	var self = this,
		snak;

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
			this.qualifiers.getData(),
			this.state.guid
		),
		new datamodel.ReferenceList(
			this.state.references
				.map( function ( reference, i ) {
					return new datamodel.Reference(
						reference.getData(),
						self.state.referenceHashes[ i ]
					);
				} )
				.filter( function ( reference ) {
					return reference.getSnaks().length > 0;
				} )
		),
		this.state.rank
	);
};

/**
 * @param {Object} config
 * @return {SnakListWidget}
 */
ItemWidget.prototype.createSnaklistWidget = function ( config ) {
	var widget = new SnakListWidget( $.extend( { editing: this.config.editing }, config ) );
	widget.connect( this, { remove: [ 'emit', 'change' ] } );
	widget.connect( this, { change: [ 'emit', 'change' ] } );
	return widget;
};

/**
 * @param {Object} [config]
 * @return {SnakListWidget}
 */
ItemWidget.prototype.createReferenceWidget = function ( config ) {
	var self = this,
		widget = this.createSnaklistWidget( $.extend( config, {
			editing: this.state.editing,
			addText: mw.msg( 'wikibasemediainfo-statements-item-add-reference-snak' )
		} ) );

	// if a reference snaklist widget is emptied, remove it entirely
	widget.on( 'empty', function () {
		var newReferences = [],
			newReferenceHashes = [];

		self.state.references.forEach( function ( reference, i ) {
			if ( widget !== reference ) {
				newReferences.push( reference );
				newReferenceHashes.push( self.state.referenceHashes[ i ] );
			}
		} );

		self.setState( {
			references: newReferences,
			referenceHashes: newReferenceHashes
		} );
	} );

	return widget;
};

/**
 * @param {datamodel.Statement} data
 * @return {jQuery.Deferred}
 */
ItemWidget.prototype.setData = function ( data ) {
	var claim,
		mainSnak,
		qualifiers,
		referencesArray,
		referencesHashes,
		type,
		i,
		newReferenceHashes = [],
		newReferenceWidgets = [],
		newReferenceWidgetPromises = [];

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof datamodel.Statement ) ) {
		throw new Error( 'Invalid statement' );
	}

	// Store the attributes we need to reference frequently for later use
	claim = data.getClaim();
	mainSnak = claim.getMainSnak();
	qualifiers = claim.getQualifiers();
	referencesArray = data.getReferences().toArray();
	type = mainSnak.getType();

	// if amount of widgets stayed the same or increased, events will be
	// emitted once those widgets receive new data (in case it changed);
	// this may not be the case if we only had removals, so we need to
	// manually emit a change event for those changes
	if ( this.state.references.length > referencesArray.length ) {
		this.emit( 'change' );
	}

	referencesHashes = referencesArray.map( function ( reference ) {
		return reference.getHash();
	} );

	for ( i = 0; i < referencesArray.length; i++ ) {
		if ( referencesHashes.indexOf( this.state.referenceHashes[ i ] ) >= 0 ) {
			// salvage existing widgets that are also in the newly received data,
			newReferenceWidgets[ i ] = this.state.references[ i ];
		} else {
			// or create new ones for data that doesn't match any existing snak
			newReferenceWidgets[ i ] = this.createReferenceWidget();
		}

		newReferenceHashes[ i ] = referencesArray[ i ].getHash();

		// now fill those new reference widgets with their relevant new data
		newReferenceWidgetPromises[ i ] = newReferenceWidgets[ i ].setData( referencesArray[ i ].getSnaks() );
	}

	return $.when.apply( $, newReferenceWidgetPromises )
		.then( this.qualifiers.setData.bind( this.qualifiers, qualifiers ) )
		.then( this.setState.bind( this, {
			propertyId: mainSnak.getPropertyId(),
			guid: claim.getGuid() || this.guidGenerator.newGuid(),
			rank: data.getRank(),
			snakType: type,
			dataValue: type === valueTypes.VALUE ? mainSnak.getValue() : null,
			references: newReferenceWidgets,
			referenceHashes: newReferenceHashes,
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

/**
 * Handle the part of the response from a wbcheckconstraints api call that is relevant to this
 * ItemWidget's property id & extract the constraint check results from the part of API
 * response that is relevant to this StatementWidget's propertyId
 *
 * @see WikibaseQualityConstraints/modules/gadget.js::_extractResultsForStatement()
 * @param {Object|null} results
 * @return {jQuery.Promise}
 */
ItemWidget.prototype.setConstraintsReport = function ( results ) {
	var self = this,
		promises = [];

	promises.push( this.setState( { constraintsReport: results && results.mainsnak.results } ) );
	promises.push( this.qualifiers.setConstraintsReport( results.qualifiers || {} ) );
	( results.references || [] ).forEach( function ( snakListResult ) {
		var i = self.state.referenceHashes.indexOf( snakListResult.hash );
		if ( i >= 0 ) {
			promises.push( self.state.references[ i ].setConstraintsReport( snakListResult.snaks ) );
		}
	} );

	// return promise that doesn't resolve until all constraints reports have been rendered
	return $.when.apply( $, promises );
};

module.exports = ItemWidget;
