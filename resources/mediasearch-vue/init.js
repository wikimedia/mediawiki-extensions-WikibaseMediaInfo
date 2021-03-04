'use strict';

require( '../polyfills/Array.prototype.find.js' );
require( '../polyfills/Array.prototype.findIndex.js' );

( function () {
	var Vue = require( 'vue' ),
		App = require( './components/App.vue' ),
		logger = require( './plugins/eventLogger.js' ),
		store = require( './store/index.js' ),
		$container = $( '<div>' ).attr( 'id', 'wbmi-media-search' ),
		$vue = $( '<div>' ).appendTo( $container );

	Vue.use( logger, {
		stream: 'mediawiki.mediasearch_interaction',
		schema: '/analytics/mediawiki/mediasearch_interaction/1.3.0'
	} );

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
				var readyDeferred = $.Deferred(),
					promises = $container.find( 'img' ).get().map( function ( image ) {
						// We start out with an initial serverside DOM that we'll swap out as
						// soon as the Vue components are mounted
						// Images, however, are not loaded until they become visible (their src
						// will not be set until they enter the viewport - see Image.vue
						// intersection observer), so we're going to see a FOUC when we replace
						// the initial existing content (which may have painted these images
						// already) with the new set of image nodes (that were not yet visible,
						// so have not been loaded)
						// We'll make sure to set the src attribute of all initial images ahead
						// of time and allow the images to load (this should be fast, given that
						// they've started loaded already in the serverside render) before we
						// empty the exiting content and replace it with the new JS components
						if ( !image.src && image.dataset && image.dataset.src ) {
							image.src = image.dataset.src;
						}

						if ( typeof image.decode !== 'function' ) {
							// If image.decode() isn't supported (e.g. IE) just return
							// a resolved promise.
							return $.Deferred().resolve().promise();
						}

						return image.decode().then( null, function () {
							// turn rejected promises into successful resolves, so that below
							// $.when can act as `allSettled` (it otherwise short-circuits as
							// as soon as one of the promises fails)
							return $.Deferred().resolve().promise();
						} );
					} );

				// When above image-loading has completed, we're allowed to proceed & swap out
				// the existing DOM with the new components. It may not complete or take awhile,
				// though (e.g. many images, poor bandwidth, other issues), in which case we
				// won't let that prevent us from taking over the content: the FOUC becomes
				// a non-issue at this point because the image likely had not loaded in the
				// initial render anyway
				// We'll replace the existing render by Vue components when either of these happen:
				// - all images of the Vue render have been loaded (or confirmed to have failed)
				// - 1 second has passed
				$.when.apply( $, promises ).then( readyDeferred.resolve );
				setTimeout( readyDeferred.resolve, 1000 );
				readyDeferred.promise().then( function () {
					// only replace serverside render once entire view has rendered
					// and images are settled, ensuring a smooth transition
					$container.show().siblings().remove();
					store.dispatch( 'ready' );
				} );
			} );
		}
	} );
}() );
