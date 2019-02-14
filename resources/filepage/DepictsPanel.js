( function ( sd, wb, st ) {
	'use strict';

	/**
	 * Panel for displaying/editing structured data depicts statements
	 *
	 * @extends OO.ui.Element
	 * @mixins OO.ui.mixin.PendingElement
	 *
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {string} headerClass CSS class of depicts header element
	 * @cfg {string} contentClass CSS class of depicts content container
	 */
	sd.DepictsPanel = function DepictsPanel( config ) {
		this.config = config || {};

		// Parent constructor
		sd.DepictsPanel.super.apply( this, arguments );

		// Mixin constructors
		OO.ui.mixin.PendingElement.call( this, this.config );

		this.api = wb.api.getLocationAgnosticMwApi( mw.config.get( 'wbRepoApiUrl' ) );
		this.contentSelector = '.' + this.config.contentClass;

		this.licenseDialogWidget = new sd.LicenseDialogWidget();

		this.headerSelector = this.contentSelector + ' .' + config.headerClass;
		this.editToggle = new OO.ui.ButtonWidget( {
			icon: 'edit',
			framed: false,
			title: mw.message( 'wikibasemediainfo-filepage-edit-depicts' ).text(),
			classes: [ 'wbmi-entityview-editButton' ]
		} );
		this.editToggle.connect( this, { click: 'makeEditable' } );

		this.cancelPublish = new sd.CancelPublishWidget(
			this
		);

		// jquery element for the link to the 'depicts' property on wikidata
		this.$depictsPropertyLink = $( this.headerSelector + ' a' );

		this.depictsInput = new st.DepictsWidget( this.config );
		this.depictsInput.connect( this, { 'manual-add': 'makeEditable' } );

		this.currentRevision = mw.config.get( 'wbCurrentRevision' );
	};

	/* Inheritance */
	OO.inheritClass( sd.DepictsPanel, OO.ui.Element );
	OO.mixinClass( sd.DepictsPanel, OO.ui.mixin.PendingElement );

	sd.DepictsPanel.prototype.initialize = function () {
		// Only allow editing if we're NOT on a diff page or viewing an older revision
		// eslint-disable-next-line jquery/no-global-selector
		if ( $( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0 ) {

			this.editToggle.$element.insertAfter( this.$depictsPropertyLink );
			this.cancelPublish.$element.insertAfter( this.$depictsPropertyLink );
			this.cancelPublish.hide();

			// Detach the pre-rendered depicts data from the DOM
			$( this.contentSelector ).children( ':not(.' + this.config.headerClass + ')' ).detach();
			// ... and load data into js widget instead
			this.depictsInput.setData(
				JSON.parse( $( this.contentSelector ).attr( 'data-statements' ) )
			);

			$( this.depictsInput.$element ).insertAfter( this.headerSelector );
		}
	};

	sd.DepictsPanel.prototype.makeEditable = function () {
		var self = this;

		// show dialog informing user of licensing & store the returned promise
		// in licenseAcceptance - submit won't be possible until dialog is closed
		this.licenseDialogWidget.getConfirmation().then( function () {
			self.cancelPublish.enablePublish();
			self.cancelPublish.show();
			self.editToggle.$element.hide();
			self.$depictsPropertyLink.hide();

			self.depictsInput.setEditing( true );
		} );
	};

	sd.DepictsPanel.prototype.makeReadOnly = function () {
		this.cancelPublish.disablePublish();
		this.cancelPublish.hide();
		this.editToggle.$element.show();
		this.$depictsPropertyLink.show();

		this.depictsInput.reset();
	};

	sd.DepictsPanel.prototype.sendData = function () {
		this.cancelPublish.disablePublish();
		this.cancelPublish.hide();
		this.editToggle.$element.show();
		this.$depictsPropertyLink.show();

		this.depictsInput.submit( this.currentRevision ).then( function ( response ) {
			self.currentRevision = response.pageinfo.lastrevid;
		} );
	};

}( mw.mediaInfo.structuredData, wikibase, mw.mediaInfo.statements ) );
