( function ( sd ) {

	'use strict';

	var depictsId = mw.config.get( 'wbmiProperties' ).depicts || '',
		depictsClass = 'wbmi-entityview-statementsGroup-' + depictsId.replace( ':', '_' ),
		$tabs;

	sd.currentRevision = mw.config.get( 'wbCurrentRevision' );

	if (
		// make sure there's a statements block on the page (e.g. if it's feature-flagged off)
		$( '.' + depictsClass ).length !== 0 &&
		// and we have an ID for "depicts" in config
		'depicts' in mw.config.get( 'wbmiProperties' ) &&
		// Only allow editing if we're NOT on a diff page or viewing an older revision
		// eslint-disable-next-line no-jquery/no-global-selector
		$( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0
	) {
		// eslint-disable-next-line no-jquery/no-global-selector
		$tabs = $( '.wbmi-tabs' );
		if ( $tabs.length > 0 ) {
			OO.ui.infuse( $tabs );
		}

		sd.depicts = new sd.DepictsPanel( {
			contentClass: depictsClass,
			entityId: mw.config.get( 'wbEntityId' ),
			externalEntitySearchApiUri: mw.config.get( 'wbmiExternalEntitySearchBaseUri' )
		} );
		sd.depicts.initialize();
	}

	sd.captions = new sd.CaptionsPanel( {
		headerClass: 'wbmi-entityview-captions-header',
		contentClass: 'wbmi-entityview-captionsPanel',
		entityTermClass: 'wbmi-entityview-caption',
		warnWithinMaxCaptionLength: 20,
		// .emptyEntity was previously used, and will be fallback value, for cached output
		// this can be removed a month after getting being merged...
		// eslint-disable-next-line no-jquery/no-global-selector
		captionsExist: mw.config.get( 'wbmiCaptionsExist', $( '.emptyEntity' ).length > 0 )
	} );
	sd.captions.initialize();

}( mw.mediaInfo.structuredData ) );
