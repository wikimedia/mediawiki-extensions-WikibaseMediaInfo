'use strict';

( function () {
	var Vue = require( 'vue' ),
		App = require( './components/App.vue' ),
		store = require( './store/index.js' ),
		$container = $( '<div>' ).attr( 'id', 'wbmi-media-search' ),
		$vue = $( '<div>' ).appendTo( $container );

	/* eslint-disable no-jquery/no-global-selector */
	$( '#mw-content-text' ).append( $container.hide() );

	// eslint-disable-next-line no-new
	new Vue( {
		el: $vue.get( 0 ),
		store: store,
		render: function ( h ) {
			return h( App );
		},
		mounted: function () {
			this.$nextTick( function () {
				// images are not loaded until they become visible, but the initial
				// page load already painted them...
				var promises = $container.find( 'img' ).get().map( function ( image ) {
					if ( !image.src && image.dataset && image.dataset.src ) {
						image.src = image.dataset.src;
					}

					if ( typeof image.decode === 'function' ) {
						return image.decode();
					}

					// If image.decode() isn't supported (e.g. IE) just return
					// a resolved promise.
					return $.Deferred().resolve().promise();
				} );

				$.when.apply( $, promises.map( function ( promise ) {
					// turn rejected promises into successful resolves, so that above
					// $.when can act as `allSettled` (it otherwise short-circuits as
					// as soon as one of the promises fails)
					return promise.then( null, function () {
						return $.Deferred().resolve();
					} );
				} ) ).then( function () {
					// only replace serverside render once entire view has rendered
					// and images are settled, ensuring a smooth transition
					$container.show().siblings().remove();
					store.dispatch( 'ready' );
				} );
			} );
		}
	} );
}() );
