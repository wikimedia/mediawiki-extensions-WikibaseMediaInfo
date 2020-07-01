'use strict';

var LIMIT = 40,
	// eslint-disable-next-line no-unused-vars
	api = new mw.Api();

module.exports = {
	/**
	 * Perform a search via API request. Should return a promise.
	 * There are a few different ways that searches should behave.
	 *
	 * - If a totally new search term has been provided, blow away existing
	 *   results for all tabs but only fetch new results for whatever tab is
	 *   currently active
	 * - If the user switches to a tab where results have not yet been loaded
	 *   but the search term is still good, fetch results for the active tab
	 *   and add them, but leave other results alone
	 * - Certain actions like scrolling will load more results within a given
	 *   queue if they are available. In this case the term and the media-type
	 *   will not change, but the "continue" state will, and new results will
	 *   be added to the current tab only
	 *
	 * @param {Object} context
	 * @param {Object} options
	 * @param {string} options.type bitmap / category / audio / video
	 * @param {string} options.term search term
	 * @param {string} options.resolution
	 * @return {jQuery.Deferred}
	 */
	search: function ( context, options ) {
		// common request params for all requests
		var params = {
			format: 'json',
			uselang: mw.config.get( 'wgUserLanguage' ),
			action: 'query',
			generator: options.type === 'category' ? 'search' : 'mediasearch',
			prop: options.type === 'category' ? 'info' : 'info|imageinfo|pageterms',
			inprop: 'url'
		};

		if ( options.type === 'category' ) {
			// category-specific params
			params.gsrsearch = options.term;
			params.gsrnamespace = 14; // NS_CATEGORY
			params.gsrlimit = LIMIT;
			params.gsroffset = context.state.continue[ options.type ] || 0;
		} else {
			// params used in all non-category searches
			params.gmssearch = options.term;
			params.iiprop = 'url|size|mime';
			params.iiurlheight = options.type === 'bitmap' ? 180 : undefined;
			params.iiurlwidth = options.type === 'video' ? 200 : undefined;
			params.wbptterms = 'label';
			params.gmsrawsearch = 'filetype:' + options.type; // TODO: suppport resolution via fileres:
			params.gmslimit = LIMIT;
			params.gmscontinue = context.state.continue[ options.type ];
		}

		// Set the pending state for the given queue
		context.commit( 'setPending', {
			type: options.type,
			pending: true
		} );

		// return api.get( params ).then( function ( response ) {
		// } );

		// Use this for testing:
		return $.get( 'https://commons.wikimedia.org/w/api.php', params ).then( function ( response ) {
			var results, pageIDs;

			if ( response.query && response.query.pages ) {
				results = response.query.pages;
				pageIDs = Object.keys( results );

				// Add each result object to the appropriate results queue
				pageIDs.forEach( function ( id ) {
					context.commit( 'addResult', {
						type: options.type,
						item: results[ id ]
					} );
				} );
			}

			// Set whether or not the query can be continued
			if ( response.continue ) {
				// Store the "continue" property of the request so we can pick up where we left off
				context.commit( 'setContinue', {
					type: options.type,
					continue: options.type === 'category' ?
						response.continue.gsroffset :
						response.continue.gmscontinue
				} );
			} else {
				context.commit( 'setContinue', {
					type: options.type,
					continue: null
				} );
			}
		} ).done( function () {
			// Set pending back to false when request is complete
			context.commit( 'setPending', {
				type: options.type,
				pending: false
			} );
		} );
	}
};
