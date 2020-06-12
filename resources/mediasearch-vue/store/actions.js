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
	 * @return {$.Deferred}
	 */
	search: function ( context, options ) {
		// common request params for all requests
		var params = {
			format: 'json',
			uselang: mw.config.get( 'wgUserLanguage' ),
			action: 'query',
			gsrsearch: options.term,
			generator: options.type === 'category' ? 'search' : 'mediasearch',
			prop: options.type === 'category' ? 'info' : 'info|imageinfo|pageterms',
			inprop: 'url'
		};

		if ( options.type === 'category' ) {
			// category-specific params
			params.gsrnamespace = 14; // NS_CATEGORY
			// TODO: gsrlimit, gsroffset
		} else {
			// params used in all non-category searches
			params.iiprop = 'url|size|mime';
			params.iiurlheight = options.type === 'bitmap' ? 180 : undefined;
			params.iiurlwidth = options.type === 'video' ? 200 : undefined;
			params.wbptterms = 'label';
			params.gmsrawsearch = 'filetype:' + options.type; // TODO: suppport resolution via fileres:
			// TODO: gmslimit, gmscontinue
		}

		console.log( params );
		return $.Deferred().resolve( params ).promise;
	}
};
