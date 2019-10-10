'use strict';

/**
 * @constructor
 * @param {Object} config Configuration options
 * @param {Object} config.qualifiers Qualifiers map: { propertyId: datatype, ...}
 * @param {string} config.entityId Entity ID (e.g. M123)
 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
 * @param {string} [config.guid] GUID of existing statement, or null for new
 * @param {number} [config.rank] One of datamodel.Statement.RANK.*
 * @param {dataValues.DataValue} [config.dataValue] Relevant DataValue object, or null for valueless
 * @param {string} [config.editing] True for edit mode, False for read mode
 */
var FormatValueElement = require( './FormatValueElement.js' ),
	QualifierWidget = require( './QualifierWidget.js' ),
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	DOMLessGroupWidget = require( 'wikibase.mediainfo.base' ).DOMLessGroupWidget,
	datamodel = require( 'wikibase.datamodel' ),
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
			dataValue: config.dataValue || null
		};

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
		labelPromise = this.state.dataValue ?
			this.formatValue( this.state.dataValue, 'text/html' ) :
			$.Deferred().resolve( '' ).promise();

	return labelPromise.then( function ( label ) {
		var id = self.dataValue ? self.dataValue.toJSON().id : '',
			prominent = self.state.rank === datamodel.Statement.RANK.PREFERRED,
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
			addQualifierButton: addQualifierButton
		};
	} );
};

/**
 * @param {Object} e
 * @return {jQuery.Promise}
 */
ItemWidget.prototype.toggleItemProminence = function ( e ) {
	e.preventDefault();

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
	return new datamodel.Statement(
		new datamodel.Claim(
			this.state.dataValue ?
				new datamodel.PropertyValueSnak( this.state.propertyId, this.state.dataValue, null ) :
				new datamodel.PropertyNoValueSnak( this.state.propertyId ),
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
		promises = [];

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof datamodel.Statement ) ) {
		throw new Error( 'Invalid statement' );
	}

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
		return !data.getClaim().getQualifiers().hasItem( qualifier );
	} ) );

	// figure out which items have an existing widget already
	// we're doing this outside of the creation below, because
	// setData is async, and new objects may not immediately
	// have their data set
	data.getClaim().getQualifiers().each( function ( i, qualifier ) {
		existing[ i ] = self.findItemFromData( qualifier );
	} );

	// add new qualifiers that don't already exist
	data.getClaim().getQualifiers().each( function ( i, qualifier ) {
		var widget = existing[ i ];
		if ( widget !== null ) {
			self.moveItem( widget, i );
		} else {
			widget = self.createQualifier();
			self.insertItem( widget, i );
		}
		promises.push( widget.setData( qualifier ) );
	} );

	return $.when.apply( $, promises ).then( this.setState.bind( this, {
		propertyId: data.getClaim().getMainSnak().getPropertyId(),
		guid: data.getClaim().getGuid() || this.guidGenerator.newGuid(),
		rank: data.getRank(),
		dataValue: data.getClaim().getMainSnak().getType() === 'value' ?
			data.getClaim().getMainSnak().getValue() :
			null
	} ) );
};

module.exports = ItemWidget;
