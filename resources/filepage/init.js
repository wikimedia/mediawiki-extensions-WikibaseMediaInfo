( function ( sd ) {

	'use strict';

	sd.captions = new sd.CaptionsPanel( {
		headerClass: 'mediainfo-captions-header',
		tableClass: 'mediainfo-captions-table',
		entityViewClass: 'filepage-mediainfo-entityview',
		entityViewAppendSelector: '.mw-parser-output',
		warnWithinMaxCaptionLength: 20
	} );
	sd.captions.initialize();

}( mw.mediaInfo.structuredData ) );
