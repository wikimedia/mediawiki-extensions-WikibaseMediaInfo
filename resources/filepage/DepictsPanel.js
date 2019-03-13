( function ( sd, wb, st, dv ) {
	'use strict';

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
	sd.DepictsPanel = function DepictsPanel( config ) {
		this.config = config || {};

		// Parent constructor
		sd.DepictsPanel.super.apply( this, arguments );

		// Mixin constructors
		OO.ui.mixin.PendingElement.call( this, this.config );

		this.api = wb.api.getLocationAgnosticMwApi( mw.config.get( 'wbRepoApiUrl' ) );

		this.$content = $( '.' + this.config.contentClass );

		this.licenseDialogWidget = new sd.LicenseDialogWidget();

		this.editToggle = new OO.ui.ButtonWidget( {
			label: mw.message( 'wikibasemediainfo-filepage-edit' ).text(),
			framed: false,
			flags: 'progressive',
			title: mw.message( 'wikibasemediainfo-filepage-edit-depicts' ).text(),
			classes: [ 'wbmi-entityview-editButton' ]
		} );

		this.editToggle.connect( this, { click: 'makeEditable' } );
		this.cancelPublish = new sd.CancelPublishWidget( this );
		this.cancelPublish.disablePublish();

		this.populateFormatValueCache( JSON.parse( this.$content.attr( 'data-formatvalue' ) || '{}' ) );
		this.depictsInput = new st.DepictsWidget( this.config );
	};

	/* Inheritance */
	OO.inheritClass( sd.DepictsPanel, OO.ui.Element );
	OO.mixinClass( sd.DepictsPanel, OO.ui.mixin.PendingElement );

	/**
	 * Pre-populate the formatValue cache, which will save some
	 * API calls if we end up wanting to format some of these...
	 *
	 * @param {Object} data
	 */
	sd.DepictsPanel.prototype.populateFormatValueCache = function ( data ) {
		Object.keys( data ).map( function ( dataValue ) {
			Object.keys( data[ dataValue ] ).map( function ( format ) {
				Object.keys( data[ dataValue ][ format ] ).map( function ( language ) {
					var json = JSON.parse( dataValue ),
						key = st.FormatValueElement.getKey(
							dv.newDataValue( json.type, json.value ), format, language
						),
						result = data[ dataValue ][ format ][ language ];
					st.FormatValueElement.toCache( key, result );
				} );
			} );
		} );
	};

	sd.DepictsPanel.prototype.initialize = function () {
		var deserializer = new wb.serialization.StatementListDeserializer(),
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

	sd.DepictsPanel.prototype.onDepictsChange = function () {
		var changes = this.depictsInput.getChanges(),
			removals = this.depictsInput.getRemovals();

		if ( changes.length > 0 || removals().length > 0 ) {
			this.cancelPublish.enablePublish();
		} else {
			this.cancelPublish.disablePublish();
		}

		this.makeEditable();
	};

	sd.DepictsPanel.prototype.makeEditable = function () {
		var self = this;

		// show dialog informing user of licensing & store the returned promise
		// in licenseAcceptance - submit won't be possible until dialog is closed
		this.licenseDialogWidget.getConfirmationIfNecessary().then( function () {
			self.cancelPublish.show();
			self.editToggle.$element.hide().addClass( 'wbmi-hidden' );
			self.$content.addClass( 'wbmi-entityview-editable' );
			self.$content.find( '.wbmi-statements-header .wbmi-entity-link' ).hide().addClass( 'wbmi-hidden' );
			self.depictsInput.setEditing( true );
		} );
	};

	sd.DepictsPanel.prototype.makeReadOnly = function () {
		var self = this;

		self.$content.removeClass( 'wbmi-entityview-editable' );
		this.cancelPublish.disablePublish();
		this.cancelPublish.hide();

		this.depictsInput.disconnect( this, { change: 'onDepictsChange' } );
		this.depictsInput.reset().then( function () {
			self.depictsInput.connect( self, { change: 'onDepictsChange' } );

			self.editToggle.$element.show().removeClass( 'wbmi-hidden' );
			self.$content.find( '.wbmi-statements-header .wbmi-entity-link' ).show().removeClass( 'wbmi-hidden' );
		} );
	};

	sd.DepictsPanel.prototype.sendData = function () {
		var self = this;
		this.cancelPublish.setStateSending();

		this.depictsInput.disconnect( this, { change: 'onDepictsChange' } );
		this.depictsInput.submit( sd.currentRevision )
			.then( function ( response ) {
				self.depictsInput.connect( self, { change: 'onDepictsChange' } );

				sd.currentRevision = response.pageinfo.lastrevid;

				self.$content.removeClass( 'wbmi-entityview-editable' );
				self.cancelPublish.setStateReady();
				self.cancelPublish.disablePublish();
				self.cancelPublish.hide();
				self.editToggle.$element.show().removeClass( 'wbmi-hidden' );
				self.$content.find( '.wbmi-statements-header .wbmi-entity-link' ).show().removeClass( 'wbmi-hidden' );
			} )
			.catch( function () {
				self.cancelPublish.setStateReady();
				self.cancelPublish.enablePublish();
			} );
	};

}( mw.mediaInfo.structuredData, wikibase, mw.mediaInfo.statements, dataValues ) );
