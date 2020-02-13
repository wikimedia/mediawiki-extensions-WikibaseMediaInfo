'use strict';

var AnonWarning = require( './AnonWarning.js' ),
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	LicenseDialogWidget = require( './LicenseDialogWidget.js' ),
	StatementWidget = require( 'wikibase.mediainfo.statements' ).StatementWidget,
	StatementListDeserializer = require( 'wikibase.serialization' ).StatementListDeserializer,
	dataTypesMap = mw.config.get( 'wbDataTypes' ),
	StatementPanel;

/**
 * Panel for displaying/editing structured data statements
 *
 * @extends OO.ui.Element
 * @mixins OO.ui.mixin.PendingElement
 *
 * @constructor
 * @param {Object} config Configuration options
 * @param {jQuery} config.$element Node to replace with statement panel
 * @param {string} config.entityId Entity ID (e.g. M123 id of the file you just uploaded)
 * @param {string} config.propertyId Property ID (e.g. P123 id of `depicts` property)
 * @param {string} config.propertyType Property datatype (e.g. 'wikibase-item', 'url', 'string', ...)
 * @param {Object} [config.helpUrls]  An object with property id as members and help urls for
 *  the property as values
 *  e.g. { P1: "https://commons.wikimedia.org/wiki/Special:MyLanguage/Commons:Depicts" }
 */
StatementPanel = function StatementPanel( config ) {
	var self = this,
		deserializer = new StatementListDeserializer(),
		statementsJson;

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

	statementsJson = JSON.parse( this.$element.attr( 'data-statements' ) || '[]' );
	this.statementWidget = new StatementWidget( $.extend( {
		showControls: true,
		valueType: dataTypesMap[ this.config.propertyType ].dataValueType
	}, this.config ) );

	// don't start subscribing to events until statementwidget has been
	// pre-populated with storage data
	this.statementWidget.resetData( deserializer.deserialize( statementsJson ) ).then( function () {
		self.statementWidget.connect( self, { cancel: [ 'makeReadOnly' ] } );
		self.statementWidget.connect( self, { publish: [ 'sendData' ] } );
		self.statementWidget.connect( self, { edit: 'makeEditable' } ); // clicked 'edit'
		self.statementWidget.connect( self, { change: 'makeEditable' } ); // changed otherwise (e.g. 'make prominent')
		self.statementWidget.connect( self, { widgetRemoved: 'remove' } );
	} );

	// attach the widget to DOM, replacing the server-side rendered equivalent
	this.$element.empty().append( this.statementWidget.$element );

	if ( !this.isSupportedType() ) {
		this.$element.addClass( 'wbmi-entityview-statementsGroup-unsupported' );
	}
};

/* Inheritance */
OO.inheritClass( StatementPanel, OO.ui.Widget );
OO.mixinClass( StatementPanel, OO.ui.mixin.PendingElement );

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
				// backward compatibility for output generated before property ids
				// were included - this can be deleted after parser caches expire
				// (30 days after this patch got deployed, so probably ~ february 2020)
				if ( !( properties instanceof Object ) ) {
					properties = { '': properties };
				}

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
 * @return {bool}
 */
StatementPanel.prototype.hasChanges = function () {
	return this.statementWidget.hasChanges();
};

/**
 * @return {bool}
 */
StatementPanel.prototype.isEditable = function () {
	return this.statementWidget.isEditing();
};

/**
 * @return {bool}
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
	} );
};

StatementPanel.prototype.sendData = function () {
	var self = this;

	this.statementWidget.disconnect( this, { change: 'makeEditable' } );

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
 * @fires widgetRemoved
 */
StatementPanel.prototype.remove = function () {
	this.emit( 'widgetRemoved', this.config.propertyId );
};

module.exports = StatementPanel;
