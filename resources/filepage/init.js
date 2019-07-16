( function () {

	'use strict';

	var statementPanels = {},
		$statements,
		captions,
		CaptionsPanel,
		statementPanel,
		StatementPanel,
		$tabs,
		AddPropertyWidget,
		LinkNoticeWidget,
		propertiesInfo = mw.config.get( 'wbmiProperties' ) || {},
		helpUrls = mw.config.get( 'wbmiHelpUrls' ) || {};

	mw.mediaInfo = mw.mediaInfo || {};
	mw.mediaInfo.structuredData = mw.mediaInfo.structuredData || {};
	mw.mediaInfo.structuredData.currentRevision = mw.config.get( 'wbCurrentRevision' );

	CaptionsPanel = require( './CaptionsPanel.js' );
	StatementPanel = require( './StatementPanel.js' );
	AddPropertyWidget = require( 'wikibase.mediainfo.statements' ).AddPropertyWidget;
	LinkNoticeWidget = require( 'wikibase.mediainfo.statements' ).LinkNoticeWidget;

	// This has to go inside hooks to allow proper creation of js elements when content is
	// replaced by the RevisionSlider extension
	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		var addPropertyWidget = new AddPropertyWidget(),
			linkNoticeWidget = new LinkNoticeWidget(),
			onStatementPanelRemoved = function ( propertyId ) {
				var removed = statementPanels[ propertyId ];
				// remove statement from the list we keep (e.g. to detect
				// changes on window unload)...
				delete statementPanels[ propertyId ];
				// remove it from DOM...
				removed.$element.remove();
				// and make sure this property can be added again later
				addPropertyWidget.onStatementPanelRemoved( propertyId );
			};

		captions = new CaptionsPanel( {
			classes: {
				header: 'wbmi-entityview-captions-header',
				content: 'wbmi-entityview-captionsPanel',
				entityTerm: 'wbmi-entityview-caption'
			},
			warnWithinMaxCaptionLength: 20,
			captionsExist: mw.config.get( 'wbmiCaptionsExist', false ),
			userLanguages: mw.config.get( 'wbUserSpecifiedLanguages', [] ).slice()
		} );
		captions.initialize();

		$statements = $content.find( '.wbmi-entityview-statementsGroup' );
		if (
			// make sure there's a statements block on the page (e.g. if it's feature-flagged off)
			$statements.length !== 0 &&
			// and we have properties configured
			Object.keys( propertiesInfo ).length > 0
		) {
			$tabs = $content.find( '.wbmi-tabs' );

			if ( $tabs.length > 0 ) {
				OO.ui.infuse( $tabs );
			}

			// Only allow editing if we're NOT on a version diff page or viewing an older revision
			if (
				// eslint-disable-next-line no-jquery/no-global-selector
				$( '.diff-currentversion-title' ).length === 0 &&
				// eslint-disable-next-line no-jquery/no-global-selector
				$( '.mw-revision' ).length === 0
			) {
				if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
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
						statementPanel.initialize();
						statementPanels[ data.id ] = statementPanel;
						statementPanel.on( 'widgetRemoved', onStatementPanelRemoved );
					} );
				}

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
					statementPanel.initialize();
					statementPanels[ propertyId ] = statementPanel;
					statementPanel.on( 'widgetRemoved', onStatementPanelRemoved );

					if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
						addPropertyWidget.addPropertyId( propertyId );
					}
				} );

				if ( !linkNoticeWidget.isDismissed() ) {
					statementPanel.$element.before( linkNoticeWidget.$element );
				}

				if ( mw.config.get( 'wbmiEnableOtherStatements', false ) ) {
					statementPanel.$element.after( addPropertyWidget.$element );
				}
			}
		}
	} );

	// Ensure browser default 'Leave Site' popup triggers when leaving a page with edits
	window.onbeforeunload = function () {
		var allPanels, hasChanges;

		// combine statement panels with captions
		allPanels = Object.keys( statementPanels ).map( function ( propertyId ) {
			return statementPanels[ propertyId ];
		} ).concat( captions );

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
