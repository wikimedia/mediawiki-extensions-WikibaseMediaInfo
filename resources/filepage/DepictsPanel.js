'use strict';

var DepictsPanel,
	LicenseDialogWidget,
	CancelPublishWidget;

CancelPublishWidget = require( './CancelPublishWidget.js' );
LicenseDialogWidget = require( './LicenseDialogWidget.js' );

/**
 * Panel for displaying/editing structured data depicts statements
 *
 * @extends OO.ui.Element
 * @mixins OO.ui.mixin.PendingElement
 *
 * @constructor
 * @param {Object} [config]
 * @cfg {string} contentClass CSS class of depicts content container
 */
DepictsPanel = function DepictsPanel( config ) {
	this.config = config || {};

	// Parent constructor
	DepictsPanel.super.apply( this, arguments );

	// Mixin constructors
	OO.ui.mixin.PendingElement.call( this, this.config );

	this.$content = $( '.' + this.config.contentClass );
	this.isEditable = false;
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

	this.populateFormatValueCache( JSON.parse( this.$content.attr( 'data-formatvalue' ) || '{}' ) );
	this.depictsInput = new mw.mediaInfo.statements.DepictsWidget( this.config );
};

/* Inheritance */
OO.inheritClass( DepictsPanel, OO.ui.Element );
OO.mixinClass( DepictsPanel, OO.ui.mixin.PendingElement );

/**
 * Pre-populate the formatValue cache, which will save some
 * API calls if we end up wanting to format some of these...
 *
 * @param {Object} data
 */
DepictsPanel.prototype.populateFormatValueCache = function ( data ) {
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

DepictsPanel.prototype.initialize = function () {
	var deserializer = new wikibase.serialization.StatementListDeserializer(),
		statementsJson;

	this.cancelPublish.hide();

	// load data into js widget instead
	statementsJson = JSON.parse( this.$content.attr( 'data-statements' ) || '[]' );
	this.depictsInput.setData( deserializer.deserialize( statementsJson ) );
	this.depictsInput.connect( this, { change: 'onDepictsChange' } );

	// ...and attach the widget to DOM, replacing the server-side rendered equivalent
	this.$content.find( ':not( .wbmi-statements-title )' ).remove();
	this.$content.append( this.depictsInput.$element );

	// ...and attach edit/cancel/publish controls
	this.$content.find( '.wbmi-statements-header .wbmi-entity-label-extra' ).append(
		this.editToggle.$element,
		this.cancelPublish.$element
	);
};

/**
 * Check for changes to statement claims or number of statements
 * @return {bool}
 */
DepictsPanel.prototype.hasChanges = function () {
	var changes, removals;

	if ( !this.isEditable ) {
		return false;
	}

	changes = this.depictsInput.getChanges();
	removals = this.depictsInput.getRemovals();

	return changes.length > 0 || removals.length > 0;
};

DepictsPanel.prototype.onDepictsChange = function () {
	var hasChanges = this.hasChanges();

	if ( hasChanges ) {
		this.cancelPublish.enablePublish();
	} else {
		this.cancelPublish.disablePublish();
	}

	this.makeEditable();
};

DepictsPanel.prototype.makeEditable = function () {
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
		self.$content.addClass( 'wbmi-entityview-editable' );
		self.$content.find( '.wbmi-statements-header .wbmi-entity-link' ).hide().addClass( 'wbmi-hidden' );
		self.depictsInput.setEditing( true );
		self.isEditable = true;
	} );
};

DepictsPanel.prototype.makeReadOnly = function () {
	var self = this;
	this.isEditable = false;
	this.$content.removeClass( 'wbmi-entityview-editable' );
	this.cancelPublish.disablePublish();
	this.cancelPublish.hide();

	this.depictsInput.disconnect( this, { change: 'onDepictsChange' } );
	this.depictsInput.reset().then( function () {
		self.depictsInput.connect( self, { change: 'onDepictsChange' } );

		self.editToggle.$element.show().removeClass( 'wbmi-hidden' );
		self.$content.find( '.wbmi-statements-header .wbmi-entity-link' ).show().removeClass( 'wbmi-hidden' );
	} );
};

DepictsPanel.prototype.sendData = function () {
	var self = this;
	this.cancelPublish.setStateSending();

	this.depictsInput.disconnect( this, { change: 'onDepictsChange' } );
	this.depictsInput.submit( mw.mediaInfo.structuredData.currentRevision )
		.then( function ( response ) {
			mw.mediaInfo.structuredData.currentRevision = response.pageinfo.lastrevid;
			self.makeReadOnly();

		} )
		.catch( function () {
			self.cancelPublish.enablePublish();
		} )
		.always( function () {
			self.depictsInput.connect( self, { change: 'onDepictsChange' } );
			self.cancelPublish.setStateReady();
		} );
};

module.exports = DepictsPanel;
