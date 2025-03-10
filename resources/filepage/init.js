( function () {

	'use strict';

	const StatementListDeserializer = require( 'wikibase.serialization' ).StatementListDeserializer,
		AddPropertyWidget = require( 'wikibase.mediainfo.statements' ).AddPropertyWidget,
		CaptionsPanel = require( './CaptionsPanel.js' ),
		LinkNoticeWidget = require( 'wikibase.mediainfo.statements' ).LinkNoticeWidget,
		ProtectionMsgWidget = require( './ProtectionMsgWidget.js' ),
		StatementPanel = require( './StatementPanel.js' ),
		defaultProperties = mw.config.get( 'wbmiDefaultProperties' ) || [],
		propertyTypes = mw.config.get( 'wbmiPropertyTypes' ) || {},
		mediaInfoEntity = mw.config.get( 'wbEntity' ) || {},
		statementPanels = {};

	let addPropertyWidget;

	Object.freeze( defaultProperties );

	mw.mediaInfo = mw.mediaInfo || {};
	mw.mediaInfo.structuredData = mw.mediaInfo.structuredData || {};
	mw.mediaInfo.structuredData.currentRevision = mw.config.get( 'wbCurrentRevision' );

	/**
	 * Infuse server-rendered OOUI tab elements, if present
	 *
	 * @param {jQuery} $content
	 * @return {OO.ui.IndexLayout}
	 */
	function infuseTabs( $content ) {
		const $tabs = $content.find( '.wbmi-tabs' );
		if ( $tabs.length === 0 ) {
			throw new Error( 'Missing MediaInfo tabs' );
		}
		const tabs = OO.ui.infuse( $tabs );
		// This shouldn't be needed, as this is the first tab, but it is (T340803)
		tabs.setTabPanel( 'wikiTextPlusCaptions' );
		return tabs;
	}

	/**
	 * Determine if panels are editable. Only allow editing if we're NOT on a
	 * version diff page or viewing an older revision, and there is no page
	 * protection.
	 *
	 * @return {boolean}
	 */
	function isEditable() {
		/* eslint-disable no-jquery/no-global-selector */
		const userCanEdit = mw.config.get( 'wgIsProbablyEditable' ),
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
	 *
	 * @param {string} propId
	 */
	function onStatementPanelRemoved( propId ) {
		statementPanels[ propId ].$element.remove();
		delete statementPanels[ propId ];
		addPropertyWidget.onStatementPanelRemoved( propId );
	}

	function checkConstraints() {
		const api = new mw.Api(),
			lang = mw.config.get( 'wgUserLanguage' );
		if (
			mw.user.isNamed() &&
			mw.config.get( 'wbmiDoConstraintCheck' )
		) {
			api.get( {
				action: 'wbcheckconstraints',
				format: 'json',
				formatversion: 2,
				uselang: lang,
				id: mw.config.get( 'wbEntityId' ),
				status: 'violation|warning|suggestion|bad-parameters'
			} ).then( ( result ) => {
				Object.keys( statementPanels ).forEach( ( key ) => {
					statementPanels[ key ].handleConstraintsResponse( result );
				} );
			} );
		}
	}

	/**
	 * Initialize a live StatementPanel widget on a given element.
	 * Also updates the statementPanels objects and adds an event listener
	 * for panel removal.
	 *
	 * @param {jQuery} $el
	 * @param {string} propId
	 * @param {string} propertyType
	 * @return {StatementPanel}
	 */
	function createStatementsPanel( $el, propId, propertyType ) {
		const editable = isEditable();

		const sp = new StatementPanel( {
			$element: $el,
			entityId: mw.config.get( 'wbEntityId' ),
			helpUrls: mw.config.get( 'wbmiHelpUrls' ) || {},
			isDefaultProperty: defaultProperties.includes( propId ),
			propertyId: propId,
			propertyType: propertyType,
			showControls: editable,
			disabled: !editable
		} );

		sp.on( 'widgetRemoved', onStatementPanelRemoved );
		sp.on( 'readOnly', checkConstraints );

		statementPanels[ propId ] = sp;

		return sp;
	}

	/**
	 * @param {OO.ui.IndexLayout} tabs
	 */
	function scrollToCurrentAnchor( tabs ) {
		if ( location.hash && location.hash.slice( 1 ) in statementPanels ) {
			Object.keys( tabs.tabPanels ).some( ( name ) => {
				const panel = tabs.getTabPanel( name ),
					$node = panel.$element.find( location.hash );

				if ( $node.length === 0 ) {
					return false;
				}

				tabs.setTabPanel( name );
				$node.get( 0 ).scrollIntoView();

				return true;
			} );
		}
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
	mw.hook( 'wikipage.content' ).add( ( $content ) => {
		const linkNoticeWidget = new LinkNoticeWidget();
		const protectionMsgWidget = new ProtectionMsgWidget();
		const $statements = $content.find( '.wbmi-structured-data-header ~ .wbmi-entityview-statementsGroup' );
		const existingProperties = defaultProperties.concat( Object.keys( mediaInfoEntity.statements || {} ) );
		const deserializer = new StatementListDeserializer();

		let tabs;
		// Try to infuse the mediainfo tabs.
		// https://phabricator.wikimedia.org/T262470.
		try {
			tabs = infuseTabs( $content );
		} catch ( e ) {
			// The mediainfo tabs are not in the DOM for some reason. Maybe a
			// gadget or user script has modified something?  Log an error to
			// the console and bail early.
			mw.log.error( e.message );
			return;
		}

		// Create AddPropertyWidget and provide it with all the IDs we know about
		addPropertyWidget = new AddPropertyWidget( { propertyIds: existingProperties } );

		// Create non-statement JS elements
		$content.find( '.wbmi-tabs-container' ).first().before( protectionMsgWidget.$element );
		const captionsPanel = createCaptionsPanel();
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.wbmi-captions-header ~ .wbmi-entityview-captionsPanel' ).replaceWith( captionsPanel.$element );

		// Add link notice widget and add property button if they don't exist.
		if ( $statements.first().hasClass( 'wbmi-entityview-statementsGroup' ) ) {
			$statements.first().before( linkNoticeWidget.$element );
		}

		if ( isEditable() && $statements.last().hasClass( 'wbmi-entityview-statementsGroup' ) ) {
			$statements.last().after( addPropertyWidget.$element );
		}

		// Set up existing statement panels
		const existingStatementPanels = $statements.get().map( ( element ) => {
			const $statement = $( element ),
				propId = $statement.data( 'mw-property' ) ||
					// Fallback for when this attribute was named differently
					// @see https://phabricator.wikimedia.org/T387691
					$statement.data( 'property' ),
				statementsJson = JSON.parse(
					$statement.attr( 'data-mw-statements' ) ||
					// Fallback for when this attribute was named differently
					// @see https://phabricator.wikimedia.org/T387691
					$statement.attr( 'data-statements' ) ||
					'[]'
				),
				data = deserializer.deserialize( statementsJson ),
				statementPanel = createStatementsPanel(
					$statement,
					propId,
					propertyTypes[ propId ]
				);

			addPropertyWidget.addPropertyId( propId );

			return statementPanel.setData( data );
		} );

		// Create panels statements added by user
		addPropertyWidget.on( 'choose', ( input, data ) => {
			const $el = $( '<div>' ).addClass( 'wbmi-entityview-statementsGroup' ).attr( 'id', data.id );

			$el.insertBefore( addPropertyWidget.$element );
			createStatementsPanel( $el, data.id, data.datatype );
			addPropertyWidget.addPropertyId( data.id );
		} );

		$.when.apply( $, existingStatementPanels ).then( checkConstraints );

		// because of the tabs, we can't rely on default browser scrolling
		// to anchor behavior (the node might be in a hidden tab)
		// if there's a URI fragment, figure out which tab it belong to
		// (if any), make that tab active, and scroll the element into view
		window.addEventListener( 'hashchange', scrollToCurrentAnchor.bind( null, tabs ) );
		$.when.apply( $, existingStatementPanels ).then( scrollToCurrentAnchor.bind( null, tabs ) );
	} );
}() );
