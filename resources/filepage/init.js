( function ( sd ) {

	'use strict';

	sd.captions = new sd.CaptionsPanel( {
		headerClass: 'wbmi-entityview-captions-header',
		contentClass: 'wbmi-entityview-content',
		entityViewClass: 'wbmi-entityview',
		entityTermClass: 'wbmi-entityview-entitycontent',
		warnWithinMaxCaptionLength: 20
	} );
	sd.captions.initialize();

}( mw.mediaInfo.structuredData ) );
