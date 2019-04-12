'use strict';

var StatementPanel,
	LicenseDialogWidget,
	CancelPublishWidget;

CancelPublishWidget = require( './CancelPublishWidget.js' );
LicenseDialogWidget = require( './LicenseDialogWidget.js' );

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
	this.statementWidget = new mw.mediaInfo.statements.StatementWidget( this.config );
};

/* Inheritance */
OO.inheritClass( StatementPanel, OO.ui.Element );
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
					key = mw.mediaInfo.statements.FormatValueElement.getKey(
						dataValues.newDataValue( json.type, json.value ), format, language
					),
					result = data[ dataValue ][ format ][ language ];
				mw.mediaInfo.statements.FormatValueElement.toCache( key, result );
			} );
		} );
	} );
};

StatementPanel.prototype.initialize = function () {
	var deserializer = new wikibase.serialization.StatementListDeserializer(),
		statementsJson;

	this.cancelPublish.hide();

	// load data into js widget instead
	statementsJson = JSON.parse( this.$element.attr( 'data-statements' ) || '[]' );
	this.statementWidget.setData( deserializer.deserialize( statementsJson ) );
	this.statementWidget.connect( this, { change: 'onDepictsChange' } );

	// ...and attach the widget to DOM, replacing the server-side rendered equivalent
	this.$element.find( ':not( .wbmi-statements-title )' ).remove();
	this.$element.append( this.statementWidget.$element );

	// ...and attach edit/cancel/publish controls
	this.$element.find( '.wbmi-statements-header .wbmi-entity-label-extra' ).append(
		this.editToggle.$element,
		this.cancelPublish.$element
	);
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

StatementPanel.prototype.onDepictsChange = function () {
	var hasChanges = this.hasChanges();

	if ( hasChanges ) {
		this.cancelPublish.enablePublish();
	} else {
		this.cancelPublish.disablePublish();
	}

	this.makeEditable();
};

StatementPanel.prototype.makeEditable = function () {
	var msg,
		self = this;

	// Show IP address logging notice to anon users
	// TODO: This code should probably be shared with CaptionsPanel through a refactor.
	if ( mw.user.isAnon() ) {
		// Hack to wrap our (rich) message in jQuery so mw.notify inserts it as HTML, not text
		msg = $( mw.config.get( 'parsedMessageAnonEditWarning' ) );
		mw.notify( msg, {
			autoHide: false,
			type: 'warn',
			tag: 'wikibasemediainfo-anonymous-edit-warning'
		} );
	}

	// show dialog informing user of licensing & store the returned promise
	// in licenseAcceptance - submit won't be possible until dialog is closed
	this.licenseDialogWidget.getConfirmationIfNecessary().then( function () {
		self.cancelPublish.show();
		self.editToggle.$element.hide().addClass( 'wbmi-hidden' );
		self.$element.addClass( 'wbmi-entityview-editable' );
		self.$element.find( '.wbmi-statements-header .wbmi-entity-link' ).hide().addClass( 'wbmi-hidden' );
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

	this.statementWidget.disconnect( this, { change: 'onDepictsChange' } );
	this.statementWidget.reset().then( function () {
		self.statementWidget.connect( self, { change: 'onDepictsChange' } );

		self.editToggle.$element.show().removeClass( 'wbmi-hidden' );
		self.$element.find( '.wbmi-statements-header .wbmi-entity-link' ).show().removeClass( 'wbmi-hidden' );
	} );
};

StatementPanel.prototype.sendData = function () {
	var self = this;
	this.cancelPublish.setStateSending();

	this.statementWidget.disconnect( this, { change: 'onDepictsChange' } );
	this.statementWidget.submit( mw.mediaInfo.structuredData.currentRevision )
		.then( function ( response ) {
			mw.mediaInfo.structuredData.currentRevision = response.pageinfo.lastrevid;
			self.makeReadOnly();

		} )
		.catch( function () {
			self.cancelPublish.enablePublish();
		} )
		.always( function () {
			self.statementWidget.connect( self, { change: 'onDepictsChange' } );
			self.cancelPublish.setStateReady();
		} );
};

module.exports = StatementPanel;
