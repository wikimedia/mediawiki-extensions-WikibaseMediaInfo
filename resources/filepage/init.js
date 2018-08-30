( function ( mw, sd, $ ) {

	'use strict';

	sd.captions = new sd.CaptionsPanel( {
		header: $( '.mediainfo-captions-header' ),
		table: $( '.mediainfo-captions-table' ),
		warnWithinMaxCaptionLength: 20
	} );
	sd.captions.initialize();

}( mediaWiki, mediaWiki.mediaInfo.structuredData, jQuery ) );
