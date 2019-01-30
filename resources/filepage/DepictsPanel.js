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
		this.data = {};

		// Parent constructor
		sd.DepictsPanel.super.apply( this, arguments );

		// Mixin constructors
		OO.ui.mixin.PendingElement.call( this, this.config );

		this.api = wb.api.getLocationAgnosticMwApi( mw.config.get( 'wbRepoApiUrl' ) );
		this.contentSelector = '.' + this.config.contentClass;
		this.currentRevision = mw.config.get( 'wbCurrentRevision' );

		this.headerSelector = this.contentSelector + ' .' + config.headerClass;
		this.editToggle = new sd.EditToggle(
			{
				titleKey: 'wikibasemediainfo-filepage-edit-depicts'
			},
			this
		);
		this.cancelPublish = new sd.CancelPublishWidget(
			this
		);

		// jquery element for the link to the 'depicts' property on wikidata
		this.$depictsPropertyLink = $( this.headerSelector + ' a' );

		this.depictsInput = new st.DepictsWidget( this.config );
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
			$( this.depictsInput.$element ).insertAfter( this.headerSelector );
		}

		this.cancelPublish.hide();
		$( this.contentSelector ).addClass( 'wbmi-entityview-state-read' );
		$( this.contentSelector + ' .wbmi-statement-empty-default-property' )
			.parents( '.wbmi-item' ).detach();
	};

	sd.DepictsPanel.prototype.makeEditable = function () {
		var $content = $( this.contentSelector );
		$content.addClass( 'wbmi-entityview-state-write' );
		$content.removeClass( 'wbmi-entityview-state-read' );
		this.editToggle.hide();
		this.cancelPublish.show();
		this.$depictsPropertyLink.hide();
	};

	sd.DepictsPanel.prototype.makeReadOnly = function () {
		var $content = $( this.contentSelector );
		$content.addClass( 'wbmi-entityview-state-read' );
		$content.removeClass( 'wbmi-entityview-state-write' );
		this.cancelPublish.hide();
		this.editToggle.show();
		this.$depictsPropertyLink.show();
	};

	sd.DepictsPanel.prototype.sendData = function () {

	};

}( mw.mediaInfo.structuredData, wikibase, mw.mediaInfo.statements ) );
