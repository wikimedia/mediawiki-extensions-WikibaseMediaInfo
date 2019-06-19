'use strict';

/**
 * @constructor
 * @param {Object} config Configuration options
 * @param {wikibase.datamodel.Statement} config.data
 * @param {Object} config.qualifiers Qualifiers map: { propertyId: datatype, ...}
 * @param {string} config.entityId Entity ID (e.g. 'M123' id of the file you just uploaded)
 * @param {string} [config.label] Label for this item (e.g. 'cat')
 * @param {string} [config.url] URL to this item (e.g. '/wiki/Item:Q1')
 * @param {string} [config.editing] True for edit mode, False for read mode
 */
var FormatValueElement = require( './FormatValueElement.js' ),
	GetRepoElement = require( './GetRepoElement.js' ),
	QualifierWidget = require( './QualifierWidget.js' ),
	NewQualifierWidget = require( './NewQualifierWidget.js' ),
	ItemWidget = function MediaInfoStatementsItemWidget( config ) {
		config = config || {};

		// set these first - the parent constructor could call other methods
		// (e.g. setDisabled) which may cause a re-render, and will need
		// some of these...
		this.editing = !!config.editing;
		this.qualifiers = config.qualifiers;
		this.data = config.data;
		this.label = config.label;
		this.url = config.url;
		this.config = config;
		this.repo = undefined;

		ItemWidget.parent.call( this, $.extend( { classes: [ 'wbmi-item' ] }, config ) );
		OO.ui.mixin.GroupElement.call( this, $.extend( {}, config ) );
		FormatValueElement.call( this, $.extend( {}, config ) );

		this.removeButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-remove' ],
			title: mw.message( 'wikibasemediainfo-statements-item-remove' ).text(),
			flags: 'destructive',
			icon: 'trash',
			framed: false
		} );
		this.removeButton.connect( this, { click: [ 'emit', 'delete' ] } );

		this.addQualifierButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-qualifier-add' ],
			label: mw.message( 'wikibasemediainfo-statements-item-add-qualifier' ).text(),
			flags: 'progressive',
			framed: false
		} );
		this.addQualifierButton.connect( this, { click: [ 'addQualifier' ] } );

		this.render();
	};
OO.inheritClass( ItemWidget, OO.ui.Widget );
OO.mixinClass( ItemWidget, OO.ui.mixin.GroupElement );
OO.mixinClass( ItemWidget, FormatValueElement );
OO.mixinClass( ItemWidget, GetRepoElement );

ItemWidget.prototype.render = function () {
	var self = this,
		promise = $.Deferred().resolve().promise(),
		dataValue;

	if ( !this.data ) {
		return;
	}

	dataValue = this.data.getClaim().getMainSnak().getValue();
	if ( this.label === undefined || this.url === undefined ) {
		promise = $.when(
			this.formatValue( dataValue, 'text/plain' ),
			this.formatValue( dataValue, 'text/html' )
		).then(
			function ( plain, html ) {
				self.label = plain;

				self.url = undefined;
				self.repo = undefined;
				try {
					self.url = $( html ).attr( 'href' );
				} catch ( e ) {
					// nothing to worry about, it's just not something with a link - we'll
					// deal with it where we want to display the link
				}
			}
		);
	}

	if ( this.repo === undefined ) {
		promise = promise.then( function () {
			if ( self.url !== undefined ) {
				return self.getRepoFromUrl( self.url ).then( function ( repo ) {
					self.repo = repo;
				} );
			}
		} );
	}

	promise.then( this.renderInternal.bind( this ) );
};

ItemWidget.prototype.toggleItemProminence = function ( e ) {
	var self = this,
		isNowProminent = self.data.getRank() === wikibase.datamodel.Statement.RANK.NORMAL;

	e.preventDefault();

	if ( self.disabled ) {
		return;
	}

	self.data.setRank(
		isNowProminent ?
			wikibase.datamodel.Statement.RANK.PREFERRED :
			wikibase.datamodel.Statement.RANK.NORMAL
	);

	self.render();
	self.emit( 'change', self );
};

ItemWidget.prototype.renderInternal = function () {
	var self = this,
		id = this.data.getClaim().getMainSnak().getValue().toJSON().id || '',
		$label = $( '<h4>' )
			.addClass( 'wbmi-entity-label' )
			.text( this.label ),
		$link = $( '<a>' )
			.addClass(
				'wbmi-entity-link ' +
				// Classes used: wbmi-entity-link-foreign-repo-* and wbmi-entity-link-local-repo
				'wbmi-entity-link' + ( this.repo ? '-foreign-repo-' + this.repo : '-local-repo' )
			)
			.attr( 'href', this.url )
			.attr( 'target', '_blank' )
			.text( id.replace( /^.+:/, '' ) ),
		icon = new OO.ui.IconWidget( { icon: 'check' } ),
		$makePrimary = $( '<a>' )
			.addClass(
				'wbmi-entity-primary ' +
				'wbmi-entity' + ( this.data.getRank() === wikibase.datamodel.Statement.RANK.NORMAL ? '-mark-as-prominent' : '-is-prominent' )
			)
			.attr( 'href', '#' )
			.text(
				this.data.getRank() === wikibase.datamodel.Statement.RANK.NORMAL ?
					mw.message( 'wikibasemediainfo-statements-item-mark-as-prominent' ).text() :
					mw.message( 'wikibasemediainfo-statements-item-is-prominent' ).text()
			)
			.prepend( this.data.getRank() === wikibase.datamodel.Statement.RANK.NORMAL ? '' : icon.$element )
			.on( 'click', self.toggleItemProminence.bind( self ) ),
		itemContainer = $( '<div>' ).addClass( 'wbmi-item-container' );

	this.$element.toggleClass( 'wbmi-item-edit', this.editing );
	this.$element.toggleClass( 'wbmi-item-read', !this.editing );

	// before we wipe out & re-build this entire thing, detach a few nodes that
	// we'll be re-using...
	this.$group.detach();
	this.removeButton.$element.detach();
	this.addQualifierButton.$element.detach();
	this.$element.empty();

	itemContainer.append(
		$( '<div>' ).addClass( 'wbmi-entity-header' ).append(
			$( '<div>' ).addClass( 'wbmi-entity-data' ).append(
				$( '<div>' ).addClass( 'wbmi-entity-title' ).append(
					$label
				),
				this.url ? $link : ''
			),
			$makePrimary
		)
	);

	if ( Object.keys( this.qualifiers ).length > 0 ) {
		itemContainer.append(
			$( '<div>' ).addClass( 'wbmi-item-content' ).append(
				this.$group.addClass( 'wbmi-item-content-group' ),
				this.editing ? this.addQualifierButton.$element : undefined
			)
		);
	}

	this.$element.append(
		itemContainer,
		this.editing ? this.removeButton.$element : undefined
	);
};

/**
 * @param {wikibase.datamodel.Snak|undefined} data
 * @return {QualifierWidget}
 */
ItemWidget.prototype.createQualifier = function ( data ) {
	var widget;

	// use alternative QualifierWidget if feature flag is set
	if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
		widget = new NewQualifierWidget();
	} else {
		widget = new QualifierWidget( {
			qualifiers: this.qualifiers
		} );
	}

	if ( data ) {
		widget.setData( data );
	}

	widget.connect( this, { delete: [ 'removeItems', [ widget ] ] } );
	widget.connect( this, { delete: 'updateData' } );
	widget.connect( this, { change: 'updateData' } );

	return widget;
};

/**
 * @param {wikibase.datamodel.Snak|undefined} data
 */
ItemWidget.prototype.addQualifier = function ( data ) {
	var widget = this.createQualifier( data );
	this.addItems( [ widget ] );
	widget.focus();
	this.updateData();
};

ItemWidget.prototype.updateData = function () {
	// it's easier just to generate a new set of qualifiers instead of fetching the
	// existing one, keeping track of which is/was where, and making updates...
	var qualifiers = new wikibase.datamodel.SnakList( this.getItems()
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
				return data instanceof wikibase.datamodel.Snak;
			} )
		),
		hasChanged = !this.data.getClaim().getQualifiers().equals( qualifiers );

	this.data.getClaim().setQualifiers( qualifiers );

	if ( hasChanged ) {
		this.emit( 'change' );
	}
};

/**
 * @inheritdoc
 */
ItemWidget.prototype.setDisabled = function ( disabled ) {
	if ( this.disabled !== disabled ) {
		ItemWidget.parent.prototype.setDisabled.call( this, disabled );
		this.render();
	}

	return this;
};

/**
 * @param {boolean} editing
 * @chainable
 * @return {OO.ui.Widget} The widget, for chaining
 */
ItemWidget.prototype.setEditing = function ( editing ) {
	if ( this.editing !== editing ) {
		this.editing = editing;
		this.render();
	}

	return this;
};

/**
 * @return {wikibase.datamodel.Statement}
 */
ItemWidget.prototype.getData = function () {
	return this.data;
};

/**
 * @param {wikibase.datamodel.Statement} data
 */
ItemWidget.prototype.setData = function ( data ) {
	var self = this,
		serializer = new wikibase.serialization.StatementSerializer(),
		deserializer = new wikibase.serialization.StatementDeserializer();

	// store a clone of the data we've been handled: if qualifiers
	// or rank change, we'll be updating this data in here, but the source
	// object should remain unaltered
	this.data = deserializer.deserialize( serializer.serialize( data ) );

	// save & re-render title
	if ( !this.data.equals( data ) ) {
		// property has changed: invalidate the label, url & repo
		this.label = undefined;
		this.url = undefined;
		this.repo = undefined;

		this.render();
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

	// add new qualifiers that don't already exist
	data.getClaim().getQualifiers().each( function ( i, qualifier ) {
		var widget = self.findItemFromData( qualifier );
		if ( widget ) {
			self.moveItem( widget, i );
		} else {
			widget = self.createQualifier( qualifier );
			self.insertItem( widget, i );
		}
	} );
	this.updateData();
};

module.exports = ItemWidget;
