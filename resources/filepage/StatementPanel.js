'use strict';

var AnonWarning = require( './AnonWarning.js' ),
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	LicenseDialogWidget = require( './LicenseDialogWidget.js' ),
	StatementWidget = require( 'wikibase.mediainfo.statements' ).StatementWidget,
	dataTypesMap = mw.config.get( 'wbDataTypes' ),
	StatementPanel;

/**
 * Panel for displaying/editing structured data statements
 *
 * @extends OO.ui.Element
 * @mixin OO.ui.mixin.PendingElement
 *
 * @constructor
 * @param {Object} config Configuration options
 * @param {jQuery} config.$element Node to replace with statement panel
 * @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
 * @param {string} config.propertyType Property datatype (e.g. 'wikibase-item', 'url', 'string', ...)
 * @param {string} config.showControls Whether or not to display editing controls
 * @param {Object} [config.helpUrls] An object with property id as members and help urls for
 * @param {Object} [config.disabled] True/false to indicate whether the statement is disabled/enabled
 *  the property as values
 *  e.g. { P1: "https://commons.wikimedia.org/wiki/Special:MyLanguage/Commons:Depicts" }
 * @fires dataLoadedReadOnly
 */
StatementPanel = function StatementPanelConstructor( config ) {
	// Parent constructor
	StatementPanel.super.apply( this, arguments );

	this.$element = config.$element;
	delete config.$element;
	this.config = config || {};

	// Mixin constructors
	OO.ui.mixin.PendingElement.call( this, this.config );

	if ( this.$element.attr( 'data-formatvalue' ) ) {
		this.populateFormatValueCache( JSON.parse( this.$element.attr( 'data-formatvalue' ) || '{}' ) );
	}

	this.licenseDialogWidget = new LicenseDialogWidget();

	this.statementWidget = new StatementWidget( $.extend( {
		showControls: !this.disabled && this.config.showControls,
		valueType: this.config.propertyType in dataTypesMap ? dataTypesMap[ this.config.propertyType ].dataValueType : undefined
	}, this.config ) );
	this.statementWidget.setDisabled( this.disabled );

	this.bindEventHandlers();

	// attach the widget to DOM, replacing the server-side rendered equivalent
	this.$element.empty().append( this.statementWidget.$element );

	if ( !this.isSupportedType() ) {
		this.$element.addClass( 'wbmi-entityview-statementsGroup-unsupported' );
	}

	this.$pending = this.$element;
};

/* Inheritance */
OO.inheritClass( StatementPanel, OO.ui.Widget );
OO.mixinClass( StatementPanel, OO.ui.mixin.PendingElement );

StatementPanel.prototype.bindEventHandlers = function () {
	this.statementWidget.connect( this, { cancel: 'makeReadOnly' } );
	this.statementWidget.connect( this, { publish: 'sendData' } );
	this.statementWidget.connect( this, { edit: 'makeEditable' } ); // clicked 'edit'
	this.statementWidget.connect( this, { change: 'makeEditable' } ); // changed otherwise (e.g. 'make prominent')
	this.statementWidget.connect( this, { widgetRemoved: 'remove' } );
};

/**
 * @param {datamodel.StatementList} data
 * @return {jQuery.promise}
 */
StatementPanel.prototype.setData = function ( data ) {
	this.unbindEventHandlers();

	// don't subscribe to events until statementwidget has been populated with data
	return this.statementWidget.resetData( data ).then( this.bindEventHandlers.bind( this ) );
};

StatementPanel.prototype.unbindEventHandlers = function () {
	this.statementWidget.disconnect( this, { cancel: 'makeReadOnly' } );
	this.statementWidget.disconnect( this, { publish: 'sendData' } );
	this.statementWidget.disconnect( this, { edit: 'makeEditable' } );
	this.statementWidget.disconnect( this, { change: 'makeEditable' } );
	this.statementWidget.disconnect( this, { widgetRemoved: 'remove' } );
};

/**
 * Pre-populate the formatValue cache, which will save some
 * API calls if we end up wanting to format some of these...
 *
 * @param {Object} data
 */
StatementPanel.prototype.populateFormatValueCache = function ( data ) {
	Object.keys( data ).forEach( function ( dataValue ) {
		Object.keys( data[ dataValue ] ).forEach( function ( format ) {
			Object.keys( data[ dataValue ][ format ] ).forEach( function ( language ) {
				var properties = data[ dataValue ][ format ][ language ];
				Object.keys( properties ).forEach( function ( propertyId ) {
					var json = JSON.parse( dataValue ),
						key = FormatValueElement.getKey(
							dataValues.newDataValue( json.type, json.value ),
							format,
							language,
							propertyId || undefined
						),
						result = properties[ propertyId ];
					FormatValueElement.toCache( key, result );
				} );
			} );
		} );
	} );
};

/**
 * Check for changes to statement claims or number of statements
 *
 * @return {boolean}
 */
StatementPanel.prototype.hasChanges = function () {
	return this.statementWidget.hasChanges();
};

/**
 * @return {boolean}
 */
StatementPanel.prototype.isEditable = function () {
	return this.statementWidget.isEditing();
};

/**
 * @return {boolean}
 */
StatementPanel.prototype.isSupportedType = function () {
	var supportedTypes = mw.config.get( 'wbmiSupportedDataTypes' ) || [];
	return supportedTypes.indexOf( this.config.propertyType ) >= 0;
};

/**
 * Toggle the panel into edit mode. This method is asynchronous.
 */
StatementPanel.prototype.makeEditable = function () {
	var self = this;

	// Show IP address logging notice to anon users
	if ( mw.user.isAnon() ) {
		AnonWarning.notifyOnce();
	}

	// show dialog informing user of licensing & store the returned promise
	// in licenseAcceptance - submit won't be possible until dialog is closed
	this.licenseDialogWidget.getConfirmationIfNecessary().then(
		function () {
			self.statementWidget.setEditing.bind( self.statementWidget, true );

			if ( !self.isSupportedType() ) {
				self.showUnsupportedPopup();
			}
		},
		this.makeReadOnly.bind( this )
	);
};

/**
 * Toggle the panel into read mode. This method is asynchronous.
 */
StatementPanel.prototype.makeReadOnly = function () {
	var self = this;
	this.statementWidget.disconnect( this, { change: 'makeEditable' } );
	this.statementWidget.resetData().then( function () {
		self.statementWidget.connect( self, { change: 'makeEditable' } );
		self.emit( 'readOnly' );
	} );
};

StatementPanel.prototype.sendData = function () {
	var self = this;

	this.statementWidget.disconnect( this, { change: 'makeEditable' } );
	this.pushPending();

	this.statementWidget.submit( mw.mediaInfo.structuredData.currentRevision || undefined )
		.then( function ( response ) {
			mw.mediaInfo.structuredData.currentRevision = response.pageinfo.lastrevid;
			self.makeReadOnly();

			// if the statement widget is removed then also remove the panel
			if ( self.statementWidget.getData().length === 0 && !self.config.isDefaultProperty ) {
				self.remove();
			}
		} ).catch( function () {
			// allow panel to be re-enabled to allow trying submission again
			self.statementWidget.setDisabled( false );
		} ).always( function () {
			self.statementWidget.connect( self, { change: 'makeEditable' } );
			self.popPending();
		} );
};

StatementPanel.prototype.showUnsupportedPopup = function () {
	var popup, popupMsg, $content;

	popupMsg = mw.message(
		'wikibasemediainfo-statements-unsupported-property-type-content'
	).parse();

	$content = $( '<div>' ).append(
		$( '<h4>' ).html(
			mw.message( 'wikibasemediainfo-statements-unsupported-property-title' ).parse()
		),
		$( '<p>' ).html( popupMsg )
	);

	popup = new OO.ui.PopupWidget( {
		$floatableContainer: this.statementWidget.$element,
		position: 'after',
		padded: true,
		autoClose: true,
		$content: $content
	} );

	this.$element.append( popup.$element );
	popup.toggle( true );
};

/**
 * Notifies the top-level Filepage/UploadWizard JS of removal so that it can be
 * handled properly.
 *
 * @fires widgetRemoved
 */
StatementPanel.prototype.remove = function () {
	this.emit( 'widgetRemoved', this.config.propertyId );
};

/**
 * Handle the response from a wbcheckconstraints api call
 *
 * @param {Object} response
 */
StatementPanel.prototype.handleConstraintsResponse = function ( response ) {
	this.statementWidget.handleConstraintsResponse(
		this.extractResultsForPropertyId( response )
	);
};

/**
 * Extract the constraint check results for a certain statement from the full API response.
 *
 * @param {Object} response The constraint check results
 * @return {Object|null} An object containing lists of constraint check results,
 * or null if the results could not be extracted.
 * @see WikibaseQualityConstraints/modules/gadget.js::_extractResultsForStatement()
 */
StatementPanel.prototype.extractResultsForPropertyId = function ( response ) {
	var propertyId = this.config.propertyId,
		entityId = mw.config.get( 'wbEntityId' ),
		entityData = response.wbcheckconstraints[ entityId ];
	if ( 'claims' in entityData ) {
		// API v2 format
		return entityData.claims[ propertyId ];
	} else {
		return null;
	}
};

StatementPanel.prototype.setDisabled = function ( disabled ) {
	this.disabled = disabled;

	if ( this.statementWidget === undefined ) {
		// object may not yet have been constructed fully
		// (ooui calls this from constructor)
		return;
	}

	this.statementWidget.setDisabled( disabled );
};

module.exports = StatementPanel;
