'use strict';

var AnonWarning = require( './AnonWarning.js' ),
	FormatValueElement = require( 'wikibase.mediainfo.statements' ).FormatValueElement,
	LicenseDialogWidget = require( './LicenseDialogWidget.js' ),
	StatementWidget = require( 'wikibase.mediainfo.statements' ).StatementWidget,
	StatementPanel;

/**
 * Panel for displaying/editing structured data statements
 *
 * @extends OO.ui.Element
 * @mixins OO.ui.mixin.PendingElement
 *
 * @constructor
 * @param {Object} [config]
 * @cfg {jQuery} $element
 * @cfg {string} propertyId
 * @cfg {string} entityId
 * @cfg {Object} properties
 * @cfg {Object} [panelRemovalListener] Object on which onStatementPanelRemoved() will be called if
 *  this panel is removed from the DOM
 * @cfg {Object} helpUrls An object with property id as members and help urls for the property
 *  as values e.g. { P1: "https://commons.wikimedia.org/wiki/Special:MyLanguage/Commons:Depicts" }
 */
StatementPanel = function StatementPanel( config ) {
	var deserializer = new wikibase.serialization.StatementListDeserializer(),
		statementsJson;

	// Parent constructor
	StatementPanel.super.apply( this, arguments );

	this.$element = config.$element;
	delete config.$element;
	this.config = config || {};

	// Mixin constructors
	OO.ui.mixin.PendingElement.call( this, this.config );

	this.populateFormatValueCache( JSON.parse( this.$element.attr( 'data-formatvalue' ) || '{}' ) );

	this.licenseDialogWidget = new LicenseDialogWidget();

	statementsJson = JSON.parse( this.$element.attr( 'data-statements' ) || '[]' );
	this.statementWidget = new StatementWidget( $.extend( { showControls: true }, this.config ) );
	this.statementWidget.setData( deserializer.deserialize( statementsJson ) );
	this.statementWidget.connect( this, { cancel: [ 'makeReadOnly' ] } );
	this.statementWidget.connect( this, { publish: [ 'sendData' ] } );

	this.panelRemovalListener = config.panelRemovalListener || undefined;

	this.statementWidget.connect( this, { edit: 'makeEditable' } ); // clicked 'edit'
	this.statementWidget.connect( this, { change: 'makeEditable' } ); // changed otherwise (e.g. 'make prominent')
	this.statementWidget.connect( this, { widgetRemoved: 'remove' } );

	// attach the widget to DOM, replacing the server-side rendered equivalent
	this.$element.empty().append( this.statementWidget.$element );
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
				var json = JSON.parse( dataValue ),
					key = FormatValueElement.getKey(
						dataValues.newDataValue( json.type, json.value ), format, language
					),
					result = data[ dataValue ][ format ][ language ];
				FormatValueElement.toCache( key, result );
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

			if (
				self.$element.hasClass( 'wbmi-entityview-statementsGroup-unsupported' ) ||
				// TODO: the following line (with '-undefined') is for BC, can
				// be removed ~30days after T224461 gets released to production
				// and parser cache has expired.
				self.$element.hasClass( 'wbmi-entityview-statementsGroup-undefined' )
			) {
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
	this.statementWidget.reset().then( function () {
		self.statementWidget.connect( self, { change: 'makeEditable' } );
	} );
};

StatementPanel.prototype.sendData = function () {
	var self = this;

	this.statementWidget.disconnect( this, { change: 'makeEditable' } );

	this.statementWidget.submit( mw.mediaInfo.structuredData.currentRevision )
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

/**
 * TODO: this entire method can be removed once other statements feature flag is
 * no longer needed
 */
StatementPanel.prototype.showUnsupportedPopup = function () {
	var popup, popupMsg, $content;

	if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
		popupMsg = mw.message(
			'wikibasemediainfo-statements-unsupported-property-type-content'
		).parse();
	} else {
		// TODO: remove the 'else' (and getSupportedProperties) when feature flag
		// MediaInfoEnableOtherStatements is removed
		popupMsg = mw.message(
			'wikibasemediainfo-statements-unsupported-property-content',
			mw.language.listToText( this.getSupportedProperties() )
		).parse();
	}

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
 * this is a bit of a hack: there's no great way to figure out
 * what properties are "supported" (what even means "supported"
 * in this project - Commons focuses on 'depicts' ATM, but other
 * wikis could use this with any other property they like, as
 * long as it's a supported data type...
 * so... let's just grab the names from DOM instead of trying to
 * figure out better methods of getting these to JS (either
 * expose as a JS config var or via an API call to format) because
 * this is only a temporary measure
 *
 * TODO: remove when feature flag MediaInfoEnableOtherStatements is removed
 *
 * @return {[string]}
 */
StatementPanel.prototype.getSupportedProperties = function () {
	// eslint-disable-next-line no-jquery/no-global-selector
	return $( '.wbmi-entityview-statementsGroup:not( .wbmi-entityview-statementsGroup-undefined )' )
		.toArray()
		.map( function ( element ) {
			return $( '.wbmi-statement-header .wbmi-entity-label', element ).text();
		} );
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
