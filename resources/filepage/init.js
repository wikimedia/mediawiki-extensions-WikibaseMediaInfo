( function ( sd ) {

	'use strict';

	sd.currentRevision = mw.config.get( 'wbCurrentRevision' );

	sd.captions = new sd.CaptionsPanel( {
		headerClass: 'wbmi-entityview-captions-header',
		contentClass: 'wbmi-entityview-captionsPanel',
		entityViewClass: 'wbmi-entityview',
		entityTermClass: 'wbmi-entityview-caption',
		warnWithinMaxCaptionLength: 20
	} );
	sd.captions.initialize();

	sd.depicts = new sd.DepictsPanel( {
		contentClass:
			'wbmi-entityview-statementsGroup-' +
			mw.config.get( 'wbmiProperties' ).depicts.replace( ':', '_' ),
		entityId: mw.config.get( 'wbEntityId' )
	} );
	sd.depicts.initialize();

}( mw.mediaInfo.structuredData ) );
