( function () {

	'use strict';

	var statementPanels = [],
		$statements,
		captions,
		CaptionsPanel,
		statementPanel,
		StatementPanel,
		$tabs;

	mw.mediaInfo = mw.mediaInfo || {};
	mw.mediaInfo.structuredData = mw.mediaInfo.structuredData || {};
	mw.mediaInfo.structuredData.currentRevision = mw.config.get( 'wbCurrentRevision' );
	mw.mediaInfo.statements = mw.mediaInfo.statements || {};

	CaptionsPanel = require( './CaptionsPanel.js' );
	StatementPanel = require( './StatementPanel.js' );

	// This has to go inside hooks to allow proper creation of js elements when content is
	// replaced by the RevisionSlider extension
	mw.hook( 'wikipage.content' ).add( function ( $content ) {

		captions = new CaptionsPanel( {
			headerClass: 'wbmi-entityview-captions-header',
			contentClass: 'wbmi-entityview-captionsPanel',
			entityTermClass: 'wbmi-entityview-caption',
			warnWithinMaxCaptionLength: 20,
			// .emptyEntity was previously used, and will be fallback value, for cached output
			// this can be removed a month after getting being merged...
			// eslint-disable-next-line no-jquery/no-global-selector
			captionsExist: mw.config.get( 'wbmiCaptionsExist', $( '.emptyEntity' ).length > 0 )
		} );

		captions.initialize();

		$statements = $content.find( '.wbmi-entityview-statementsGroup' );
		if (
			// make sure there's a statements block on the page (e.g. if it's feature-flagged off)
			$statements.length !== 0 &&
			// and we have properties configured
			Object.keys( mw.config.get( 'wbmiProperties' ) ).length > 0
		) {
			$tabs = $content.find( '.wbmi-tabs' );

			if ( $tabs.length > 0 ) {
				OO.ui.infuse( $tabs );
			}

			// Only allow editing if we're NOT on a diff page or viewing an older revision
			// eslint-disable-next-line no-jquery/no-global-selector
			if ( $( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0 ) {
				$statements.each( function () {
					var propertyId = $( this ).data( 'property' );
					if ( !propertyId ) {
						// backward compatibility for cached HTML - the 'property' attribute didn't use
						// to exist, but this classname that includes the ID was already there...
						propertyId = $( this ).attr( 'class' ).replace( /.*wbmi-entityview-statementsGroup-([a-z0-9]+).*/i, '$1' );
					}

					statementPanel = new StatementPanel( {
						$element: $( this ),
						propertyId: propertyId,
						entityId: mw.config.get( 'wbEntityId' )
					} );
					statementPanel.initialize();

					statementPanels.push( statementPanel );
				} );
			}
		}
	} );

	// Ensure browser default 'Leave Site' popup triggers when leaving a page with edits
	window.onbeforeunload = function () {
		var hasChanges = statementPanels.concat( captions ).some( function ( panel ) {
			return panel && panel.isEditable() && panel.hasChanges();
		} );

		if ( hasChanges ) {
			// this message is not usually displayed (browsers have default language)
			// include a valid message for some versions of IE that display the message
			return mw.message( 'wikibasemediainfo-filepage-cancel-confirm' ).text();
		}
	};
}() );
