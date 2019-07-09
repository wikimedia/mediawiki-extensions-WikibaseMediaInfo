'use strict';

var AnonWarning = require( './AnonWarning.js' ),
	CancelPublishWidget = require( './CancelPublishWidget.js' ),
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
	// Parent constructor
	StatementPanel.super.apply( this, arguments );

	this.$element = config.$element;
	delete config.$element;

	this.config = config || {};

	// Mixin constructors
	OO.ui.mixin.PendingElement.call( this, this.config );

	this.editing = false;
	this.licenseDialogWidget = new LicenseDialogWidget();
	this.editToggle = new OO.ui.ButtonWidget( {
		label: mw.message( 'wikibasemediainfo-filepage-edit' ).text(),
		framed: false,
		flags: 'progressive',
		title: mw.message( 'wikibasemediainfo-filepage-edit-depicts' ).text(),
		classes: [ 'wbmi-entityview-editButton' ]
	} );

	this.editToggle.connect( this, { click: 'makeEditable' } );
	this.cancelPublish = new CancelPublishWidget( this );
	this.cancelPublish.disablePublish();

	this.populateFormatValueCache( JSON.parse( this.$element.attr( 'data-formatvalue' ) || '{}' ) );
	this.statementWidget = new StatementWidget( this.config );

	this.panelRemovalListener = config.panelRemovalListener || undefined;
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
	Object.keys( data ).map( function ( dataValue ) {
		Object.keys( data[ dataValue ] ).map( function ( format ) {
			Object.keys( data[ dataValue ][ format ] ).map( function ( language ) {
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

StatementPanel.prototype.initialize = function () {
	var deserializer = new wikibase.serialization.StatementListDeserializer(),
		statementsJson,
		popup,
		self = this;

	this.cancelPublish.hide();

	// load data into js widget instead
	statementsJson = JSON.parse( this.$element.attr( 'data-statements' ) || '[]' );
	this.statementWidget.setData( deserializer.deserialize( statementsJson ) );
	this.statementWidget.connect( this, { change: 'onStatementChange' } );

	// ...and attach the widget to DOM, replacing the server-side rendered equivalent
	this.$element.empty().append( this.statementWidget.$element );

	// ...and attach edit/cancel/publish controls
	this.statementWidget.$element.find( '.wbmi-statement-header' ).append( this.editToggle.$element );
	this.statementWidget.$element.find( '.wbmi-statement-footer' ).append( this.cancelPublish.$element );

	if ( this.config.properties && this.config.properties[ this.config.propertyId ] !== 'wikibase-entityid' ) {
		this.$element.addClass( 'wbmi-entityview-statementsGroup-unsupported' );
	}

	if (
		this.$element.hasClass( 'wbmi-entityview-statementsGroup-unsupported' ) ||
		// TODO: the following line (with '-undefined') is for BC, can be removed ~30days after
		// T224461 gets released to production and parser cache has expired
		this.$element.hasClass( 'wbmi-entityview-statementsGroup-undefined' )
	) {
		popup = new OO.ui.PopupWidget( {
			$floatableContainer: this.editToggle.$element,
			padded: true,
			autoClose: true
		} );

		this.$element.append( popup.$element );
		this.editToggle.on( 'click', function () {
			var popupMsg;

			if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
				popupMsg = mw.message(
					'wikibasemediainfo-statements-unsupported-property-type-content'
				).parse();
			} else {
				// TODO: remove the 'else' (and getSupportedProperties) when feature flag
				// MediaInfoEnableOtherStatements is removed
				popupMsg = mw.message(
					'wikibasemediainfo-statements-unsupported-property-content',
					mw.language.listToText( self.getSupportedProperties() )
				).parse();
			}

			popup.$body.empty().append(
				$( '<div>' ).append(
					$( '<h4>' ).html( mw.message( 'wikibasemediainfo-statements-unsupported-property-title' ).parse() ),
					$( '<p>' ).html( popupMsg )
				)
			);
			popup.toggle( true );
		} );
	}
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
			return $(
				// 2nd selector (plural wbmi-statements-header) is for
				// backward compatibility - can be removed July 2019
				'.wbmi-statement-header .wbmi-entity-label, .wbmi-statements-header .wbmi-entity-label',
				element
			).text();
		} );
};

/**
 * Check for changes to statement claims or number of statements
 * @return {bool}
 */
StatementPanel.prototype.hasChanges = function () {
	var changes = this.statementWidget.getChanges(),
		removals = this.statementWidget.getRemovals();

	return changes.length > 0 || removals.length > 0;
};

StatementPanel.prototype.isEditable = function () {
	return this.editing;
};

StatementPanel.prototype.onStatementChange = function () {
	var hasChanges = this.hasChanges();

	if ( hasChanges ) {
		this.cancelPublish.enablePublish();
	} else {
		this.cancelPublish.disablePublish();
	}

	this.makeEditable();
};

StatementPanel.prototype.makeEditable = function () {
	var self = this;

	// Show IP address logging notice to anon users
	if ( mw.user.isAnon() ) {
		AnonWarning.notifyOnce();
	}

	// show dialog informing user of licensing & store the returned promise
	// in licenseAcceptance - submit won't be possible until dialog is closed
	this.licenseDialogWidget.getConfirmationIfNecessary().then( function () {
		self.cancelPublish.show();
		self.editToggle.$element.hide();
		self.$element.addClass( 'wbmi-entityview-editable' );
		self.statementWidget.setEditing( true );
		self.editing = true;
	} );
};

StatementPanel.prototype.makeReadOnly = function () {
	var self = this;
	this.editing = false;
	this.$element.removeClass( 'wbmi-entityview-editable' );
	this.cancelPublish.disablePublish();
	this.cancelPublish.hide();

	this.statementWidget.disconnect( this, { change: 'onStatementChange' } );
	this.statementWidget.reset().then( function () {
		self.statementWidget.connect( self, { change: 'onStatementChange' } );
		self.editToggle.$element.show();
	} );
};

StatementPanel.prototype.sendData = function () {
	var self = this;
	this.cancelPublish.setStateSending();

	this.statementWidget.disconnect( this, { change: 'onStatementChange' } );
	this.statementWidget.submit( mw.mediaInfo.structuredData.currentRevision )
		.then( function ( response ) {
			mw.mediaInfo.structuredData.currentRevision = response.pageinfo.lastrevid;
			self.makeReadOnly();

			// if the statement widget is removed then also remove the panel
			if (
				self.statementWidget.getData().length === 0 &&
				!self.config.isDefaultProperty
			) {
				self.emit( 'widgetRemoved', self.config.propertyId );
			}
		} )
		.catch( function () {
			self.cancelPublish.enablePublish();
		} )
		.always( function () {
			self.statementWidget.connect( self, { change: 'onStatementChange' } );
			self.cancelPublish.setStateReady();
		} );
};

module.exports = StatementPanel;
