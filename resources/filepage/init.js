( function () {

	'use strict';

	var AddPropertyWidget = require( 'wikibase.mediainfo.statements' ).AddPropertyWidget,
		CaptionsPanel = require( './CaptionsPanel.js' ),
		LinkNoticeWidget = require( 'wikibase.mediainfo.statements' ).LinkNoticeWidget,
		ProtectionMsgWidget = require( './ProtectionMsgWidget.js' ),
		StatementPanel = require( './StatementPanel.js' ),
		addPropertyWidget,
		defaultProperties = mw.config.get( 'wbmiDefaultProperties' ) || [],
		propertyTypes = mw.config.get( 'wbmiPropertyTypes' ) || {},
		mediaInfoEntity = mw.config.get( 'wbEntity' ) || {},
		statementPanels = {},
		captionsPanel;

	Object.freeze( defaultProperties );

	mw.mediaInfo = mw.mediaInfo || {};
	mw.mediaInfo.structuredData = mw.mediaInfo.structuredData || {};
	mw.mediaInfo.structuredData.currentRevision = mw.config.get( 'wbCurrentRevision' );

	/**
	 * Infuse server-rendered OOUI tab elements, if present
	 * @param {jQuery} $content
	 */
	function infuseTabs( $content ) {
		var $tabs = $content.find( '.wbmi-tabs' );

		if ( $tabs.length > 0 ) {
			OO.ui.infuse( $tabs );
		}
	}

	/**
	 * Determine if panels are editable. Only allow editing if we're NOT on a
	 * version diff page or viewing an older revision, and there is no page
	 * protection.
	 * @return {boolean}
	 */
	function isEditable() {
		/* eslint-disable no-jquery/no-global-selector */
		var userCanEdit = mw.config.get( 'wbmiUserCanEdit' ),
			onDiffPage = $( '.diff-currentversion-title' ).length !== 0,
			onRevisionPage = $( '.mw-revision' ).length !== 0;
		/* eslint-enable no-jquery/no-global-selector */

		if ( !onDiffPage && !onRevisionPage && userCanEdit ) {
			return true;
		} else {
			return false;
		}
	}

	/**
	 * @return {CaptionsPanel} CaptionsPanel
	 */
	function createCaptionsPanel() {
		return new CaptionsPanel( {
			warnWithinMaxCaptionLength: 20,
			userLanguages: mw.config.get( 'wbUserSpecifiedLanguages', [] ).slice(),
			languageFallbackChain: mw.language.getFallbackLanguageChain(),
			canEdit: isEditable(),
			mediaInfo: mediaInfoEntity
		} );
	}

	/**
	 * Handle StatementPanel removal
	 * @param {string} propId
	 */
	function onStatementPanelRemoved( propId ) {
		statementPanels[ propId ].$element.remove();
		delete statementPanels[ propId ];
		addPropertyWidget.onStatementPanelRemoved( propId );
	}

	/**
	 * Initialize a live StatementPanel widget on a given element.
	 * Also updates the statementPanels objects and adds an event listener
	 * for panel removal.
	 * @param {jQuery} $el
	 * @param {string} propId
	 * @param {string} propertyType
	 * @return {StatementPanel}
	 */
	function createStatementsPanel( $el, propId, propertyType ) {
		var sp;

		sp = new StatementPanel( {
			$element: $el,
			entityId: mw.config.get( 'wbEntityId' ),
			helpUrls: mw.config.get( 'wbmiHelpUrls' ) || {},
			isDefaultProperty: defaultProperties.indexOf( propId ) >= 0,
			propertyId: propId,
			propertyType: propertyType
		} );

		sp.on( 'widgetRemoved', onStatementPanelRemoved );
		statementPanels[ propId ] = sp;
		return sp;
	}

	/**
	 * Add JS elements on the page when the "content" hook is fired in order to
	 * play nicely with RevisionSlider
	 *
	 * This function needs to do the following:
	 *
	 * - Infuse server-rendered OOUI tabs
	 * - Create an addPropertyWidget and set up appropriate event handler
	 * - Create captions panel
	 * - Create statements panels
	 *
	 * @param {jQuery} content
	 */
	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var linkNoticeWidget = new LinkNoticeWidget(),
			protectionMsgWidget = new ProtectionMsgWidget(),
			$statements = $content.find( '.wbmi-entityview-statementsGroup' ),
			existingProperties = defaultProperties.concat( Object.keys( mediaInfoEntity.statements || {} ) );

		// Create AddPropertyWidget and provide it with all the IDs we know about
		addPropertyWidget = new AddPropertyWidget( { propertyIds: existingProperties } );

		// Create non-statement JS elements
		infuseTabs( $content );
		$content.find( '.wbmi-tabs-container' ).first().before( protectionMsgWidget.$element );
		captionsPanel = createCaptionsPanel();
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.wbmi-entityview-captionsPanel' ).replaceWith( captionsPanel.$element );

		// Add link notice widget and add property button if they don't exist.
		if ( $statements.first().hasClass( 'wbmi-entityview-statementsGroup' ) ) {
			$statements.first().before( linkNoticeWidget.$element );
		}

		if ( $statements.last().hasClass( 'wbmi-entityview-statementsGroup' ) ) {
			$statements.last().after( addPropertyWidget.$element );
		}

		// Set up existing statement panels
		$statements.map( function () {
			var $statement = $( this ),
				propId = $statement.data( 'property' );

			createStatementsPanel( $statement, propId, propertyTypes[ propId ] || 'string' );
			addPropertyWidget.addPropertyId( propId );
		} );

		// Create panels statements added by user
		addPropertyWidget.on( 'choose', function ( input, data ) {
			var $el = $( '<div>' ).addClass( 'wbmi-entityview-statementsGroup' );

			$el.insertBefore( addPropertyWidget.$element );
			createStatementsPanel( $el, data.id, data.datatype );
			addPropertyWidget.addPropertyId( data.id );
		} );
	} );

	/**
	 * Ensure browser default 'Leave Site' popup triggers when leaving a page
	 * with edits
	 * @return {string} message
	 */
	window.onbeforeunload = function () {
		var allPanels,
			hasChanges;

		// combine statement panels with captions panel
		allPanels = Object.keys( statementPanels ).map( function ( propertyId ) {
			return statementPanels[ propertyId ];
		} ).concat( captionsPanel );

		hasChanges = allPanels.some( function ( panel ) {
			return panel && panel.isEditable() && panel.hasChanges();
		} );

		if ( hasChanges ) {
			// this message is not usually displayed (browsers have default language)
			// include a valid message for some versions of IE that display the message
			return mw.message( 'wikibasemediainfo-filepage-cancel-confirm' ).text();
		}
	};
}() );
