( function () {
	'use strict';

	var widget;

	if ( !mw.config.get( 'wbmiMediaInfoEnableSearch', false ) ) {
		return;
	}

	widget = new mw.mediaInfo.search.SearchWidget( { minLookupCharacters: 2 } );
	// eslint-disable-next-line no-jquery/no-global-selector
	$( '#p-search' ).replaceWith( widget.$element );

}() );
