( function ( search ) {

	'use strict';

	if ( !mw.config.get( 'wbmiMediaInfoEnableSearch', false ) ) {
		return;
	}

	search.Init = function MediaInfoSearch() {
		this.input = new search.SearchWidget( { minLookupCharacters: 2 } );
	};

	search.Init.prototype.bind = function ( $element ) {
		$element.replaceWith( this.input.$element );
	};

	var init = new search.Init();
	// eslint-disable-next-line no-jquery/no-global-selector
	init.bind( $( '#p-search' ) );

}( mw.mediaInfo.search ) );
