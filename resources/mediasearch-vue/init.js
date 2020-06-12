'use strict';

( function () {
	var Vue = require( 'vue' ),
		App = require( './components/App.vue' ),
		store = require( './store/index.js' );

	// TODO: This should probably be handled differently
	/* eslint-disable no-jquery/no-global-selector */
	/* eslint-disable no-jquery/no-parse-html-literal */
	$( '#mw-content-text' ).empty().append( $( '<div id="media-search-vue"></div>' ) );

	// eslint-disable-next-line no-new
	new Vue( {
		el: '#media-search-vue',
		store: store,
		render: function ( h ) {
			return h( App );
		}
	} );
}() );
