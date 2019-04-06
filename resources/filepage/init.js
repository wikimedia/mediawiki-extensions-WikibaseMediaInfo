( function () {

	'use strict';

	var depictsId = mw.config.get( 'wbmiProperties' ).depicts || '',
		depictsClass = 'wbmi-entityview-statementsGroup-' + depictsId.replace( ':', '_' ),
		captions,
		CaptionsPanel,
		depicts,
		DepictsPanel,
		$tabs;

	mw.mediaInfo = mw.mediaInfo || {};
	mw.mediaInfo.structuredData = mw.mediaInfo.structuredData || {};
	mw.mediaInfo.structuredData.currentRevision = mw.config.get( 'wbCurrentRevision' );
	mw.mediaInfo.statements = mw.mediaInfo.statements || {};

	CaptionsPanel = require( './CaptionsPanel.js' );
	DepictsPanel = require( './DepictsPanel.js' );

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

		if (
			// make sure there's a statements block on the page (e.g. if it's feature-flagged off)
			$content.find( '.' + depictsClass ).length !== 0 &&
			// and we have an ID for "depicts" in config
			'depicts' in mw.config.get( 'wbmiProperties' )
		) {
			$tabs = $content.find( '.wbmi-tabs' );

			if ( $tabs.length > 0 ) {
				OO.ui.infuse( $tabs );
			}

			// Only allow editing if we're NOT on a diff page or viewing an older revision
			if ( $content.find( '.diff' ).length === 0 && $content.find( '.mw-revision' ).length === 0 ) {
				depicts = new DepictsPanel( {
					contentClass: depictsClass,
					entityId: mw.config.get( 'wbEntityId' )
				} );

				depicts.initialize();
			}
		}
	} );

	// Ensure browser default 'Leave Site' popup triggers when leaving a page with edits
	window.onbeforeunload = function () {
		if (
			( captions.isEditable() && captions.hasChanges() ) ||
			( depicts && depicts.isEditable() && depicts.hasChanges() )
		) {
			// this message is not usually displayed (browsers have default language)
			// include a valid message for some versions of IE that display the message
			return mw.message( 'wikibasemediainfo-filepage-cancel-confirm' ).text();
		} else {
			return undefined;
		}
	};
}() );
