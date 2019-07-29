( function () {

	'use strict';

	var statementPanels = {},
		$statements,
		captionsPanel,
		CaptionsPanel,
		statementPanel,
		StatementPanel,
		$tabs,
		ProtectionMsgWidget,
		AddPropertyWidget,
		LinkNoticeWidget,
		propertiesInfo = mw.config.get( 'wbmiProperties' ) || {},
		helpUrls = mw.config.get( 'wbmiHelpUrls' ) || {},
		userCanEdit = mw.config.get( 'wbmiUserCanEdit' );

	mw.mediaInfo = mw.mediaInfo || {};
	mw.mediaInfo.structuredData = mw.mediaInfo.structuredData || {};
	mw.mediaInfo.structuredData.currentRevision = mw.config.get( 'wbCurrentRevision' );

	CaptionsPanel = require( './CaptionsPanel.js' );
	StatementPanel = require( './StatementPanel.js' );
	ProtectionMsgWidget = require( './ProtectionMsgWidget.js' );
	AddPropertyWidget = require( 'wikibase.mediainfo.statements' ).AddPropertyWidget;
	LinkNoticeWidget = require( 'wikibase.mediainfo.statements' ).LinkNoticeWidget;

	// This has to go inside hooks to allow proper creation of js elements when content is
	// replaced by the RevisionSlider extension
	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var protectionMsgWidget = new ProtectionMsgWidget(),
			addPropertyWidget = new AddPropertyWidget(),
			linkNoticeWidget = new LinkNoticeWidget(),
			mediaInfoEntity = mw.config.get( 'wbEntity' ),
			onStatementPanelRemoved = function ( propertyId ) {
				var removed = statementPanels[ propertyId ];
				// remove statement from the list we keep (e.g. to detect
				// changes on window unload)...
				delete statementPanels[ propertyId ];
				// remove it from DOM...
				removed.$element.remove();
				// and make sure this property can be added again later
				addPropertyWidget.onStatementPanelRemoved( propertyId );
			},
			panelsAreEditable;

		// Only allow editing if we're NOT on a version diff page or viewing an
		// older revision, and there is no page protection.
		// eslint-disable-next-line no-jquery/no-global-selector
		panelsAreEditable = $( '.diff-currentversion-title' ).length === 0 &&
			// eslint-disable-next-line no-jquery/no-global-selector
			$( '.mw-revision' ).length === 0 &&
			userCanEdit;

		// Add the protection message widget above the tabs container.
		$content.find( '.wbmi-tabs-container' ).first().before( protectionMsgWidget.$element );

		captionsPanel = new CaptionsPanel( {
			warnWithinMaxCaptionLength: 20,
			userLanguages: mw.config.get( 'wbUserSpecifiedLanguages', [] ).slice(),
			languageFallbackChain: mw.language.getFallbackLanguageChain(),
			canEdit: panelsAreEditable,
			mediaInfo: mediaInfoEntity
		} );
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.wbmi-entityview-captionsPanel' ).replaceWith( captionsPanel.$element );

		$statements = $content.find( '.wbmi-entityview-statementsGroup' );
		if (
			// make sure there's a statements block on the page
			// (e.g. if it's feature-flagged off)
			$statements.length !== 0 &&
			// and we have properties configured
			Object.keys( propertiesInfo ).length > 0
		) {
			$tabs = $content.find( '.wbmi-tabs' );

			if ( $tabs.length > 0 ) {
				OO.ui.infuse( $tabs );
			}

			if ( panelsAreEditable ) {
				addPropertyWidget = new AddPropertyWidget();
				addPropertyWidget.on( 'choose', function ( data ) {
					var statementPanel,
						statementPanelContainer = $( '<div>' )
							.addClass( 'wbmi-entityview-statementsGroup' )
							.insertBefore( addPropertyWidget.$element );

					propertiesInfo[ data.id ] = 'wikibase-entityid';
					statementPanel = new StatementPanel( {
						$element: statementPanelContainer,
						propertyId: data.id,
						entityId: mw.config.get( 'wbEntityId' ),
						properties: propertiesInfo,
						isDefaultProperty: false,
						helpUrls: helpUrls
					} );
					statementPanels[ data.id ] = statementPanel;
					statementPanel.on( 'widgetRemoved', onStatementPanelRemoved );
				} );

				$statements.each( function () {
					var propertyId = $( this ).data( 'property' );
					if ( !propertyId ) {
						// backward compatibility for cached HTML - the 'property' attribute didn't
						// use to exist, but this classname that includes the ID was already there
						propertyId = $( this )
							.attr( 'class' )
							.replace( /.*wbmi-entityview-statementsGroup-([a-z0-9]+).*/i, '$1' );
					}

					statementPanel = new StatementPanel( {
						$element: $( this ),
						propertyId: propertyId,
						entityId: mw.config.get( 'wbEntityId' ),
						properties: propertiesInfo,
						isDefaultProperty: propertyId in propertiesInfo,
						helpUrls: helpUrls
					} );
					statementPanels[ propertyId ] = statementPanel;
					statementPanel.on( 'widgetRemoved', onStatementPanelRemoved );

					addPropertyWidget.addPropertyId( propertyId );
				} );

				$statements.first().before( linkNoticeWidget.$element );
				$statements.last().after( addPropertyWidget.$element );
			}
		}

	} );

	// Ensure browser default 'Leave Site' popup triggers when leaving a page with edits
	window.onbeforeunload = function () {
		var allPanels, hasChanges;

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
