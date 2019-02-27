( function ( sd ) {

	'use strict';

	var depictsClass = 'wbmi-entityview-statementsGroup-' +
		mw.config.get( 'wbmiProperties' ).depicts.replace( ':', '_' );

	sd.currentRevision = mw.config.get( 'wbCurrentRevision' );

	sd.captions = new sd.CaptionsPanel( {
		headerClass: 'wbmi-entityview-captions-header',
		contentClass: 'wbmi-entityview-captionsPanel',
		entityViewClass: 'wbmi-entityview',
		entityTermClass: 'wbmi-entityview-caption',
		warnWithinMaxCaptionLength: 20
	} );
	sd.captions.initialize();

	if (
		// make sure there's a statements block on the page (e.g. if it's feature-flagged off)
		$( '.' + depictsClass ).length !== 0 &&
		// and we have an ID for "depicts" in config
		'depicts' in mw.config.get( 'wbmiProperties' ) &&
		// Only allow editing if we're NOT on a diff page or viewing an older revision
		// eslint-disable-next-line jquery/no-global-selector
		$( '.diff' ).length === 0 && $( '.mw-revision' ).length === 0
	) {
		sd.depicts = new sd.DepictsPanel( {
			contentClass: depictsClass,
			entityId: mw.config.get( 'wbEntityId' )
		} );
		sd.depicts.initialize();
	}

}( mw.mediaInfo.structuredData ) );
