( function () {

	'use strict';

	mw.mediaInfo = mw.mediaInfo || {};
	mw.mediaInfo.structuredData = mw.mediaInfo.structuredData || {};
	mw.mediaInfo.structuredData.currentRevision = mw.config.get( 'wbCurrentRevision' );
	mw.mediaInfo.statements = mw.mediaInfo.statements || {};

	var depictsId = mw.config.get( 'wbmiProperties' ).depicts || '',
		depictsClass = 'wbmi-entityview-statementsGroup-' + depictsId.replace( ':', '_' ),
		captions,
		CaptionsPanel,
		depicts,
		DepictsPanel,
		$tabs;

	CaptionsPanel = require( './CaptionsPanel.js' );
	DepictsPanel = require( './DepictsPanel.js' );

	if (
		// make sure there's a statements block on the page (e.g. if it's feature-flagged off)
		$( '.' + depictsClass ).length !== 0 &&
		// and we have an ID for "depicts" in config
		'depicts' in mw.config.get( 'wbmiProperties' )
	) {
		// eslint-disable-next-line no-jquery/no-global-selector
		$tabs = $( '.wbmi-tabs' );

		if ( $tabs.length > 0 ) {
			OO.ui.infuse( $tabs );
		}

		// Only allow editing if we're NOT on a diff page or viewing an older revision
		// eslint-disable-next-line no-jquery/no-global-selector
		if ( $( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0 ) {
			depicts = new DepictsPanel( {
				contentClass: depictsClass,
				entityId: mw.config.get( 'wbEntityId' )
			} );

			depicts.initialize();
		}
	}

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

}() );
