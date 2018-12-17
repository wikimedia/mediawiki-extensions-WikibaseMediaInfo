( function ( sd ) {

	'use strict';

	sd.captions = new sd.CaptionsPanel( {
		headerClass: 'mediainfo-captions-header',
		contentClass: 'filepage-mediainfo-entitytermsview',
		entityViewClass: 'filepage-mediainfo-entityview',
		entityTermClass: 'entity-term',
		warnWithinMaxCaptionLength: 20
	} );
	sd.captions.initialize();

}( mw.mediaInfo.structuredData ) );
