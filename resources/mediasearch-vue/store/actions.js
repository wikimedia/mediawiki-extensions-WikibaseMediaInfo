'use strict';

var LIMIT = 40,
	api = new mw.Api(),
	activeRequest = null;

/**
 * Generate additional (non-term) search keywords for filters.
 *
 * @param {string} mediaType
 * @param {Object} filterValues Filter values for this media type
 * @return {string}
 */
function getMediaFilters( mediaType, filterValues ) {
	var raw;

	// Start with a filter based on media type(s).
	switch ( mediaType ) {
		case 'bitmap':
			raw = 'filetype:bitmap|drawing';
			break;

		case 'other':
			raw = 'filetype:multimedia|office|archive|3d';
			break;

		default:
			raw = 'filetype:' + mediaType;
			break;
	}

	function addFilter( filterType, paramKey ) {
		var value = filterType in filterValues ?
			filterValues[ filterType ] : null;
		if ( value ) {
			return ' ' + paramKey + ':' + value;
		}

		return '';
	}

	raw += addFilter( 'mimeType', 'filemime' );
	raw += addFilter( 'imageSize', 'fileres' );

	return raw;
}

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
	 * @param {string} options.type bitmap / page / audio / video / other
	 * @param {string} options.term search term
	 * @return {jQuery.Deferred}
	 */
	search: function ( context, options ) {
		// common request params for all requests
		var params = {
				format: 'json',
				uselang: mw.config.get( 'wgUserLanguage' ),
				action: 'query',
				generator: 'search',
				gsrsearch: options.term,
				gsrlimit: LIMIT,
				gsroffset: context.state.continue[ options.type ] || 0,
				prop: options.type === 'page' ? 'info|categoryinfo' : 'info|imageinfo|pageterms',
				inprop: 'url'
			},
			filters,
			urlWidth,
			request;

		if ( options.type === 'page' ) {
			// Page/category-specific params.
			params.gsrnamespace = mw.config.get( 'wbmiMediaSearchPageNamespaces' );
		} else {
			// Params used in all non-page/category searches.
			filters = getMediaFilters( options.type, context.state.filterValues[ options.type ] );
			if ( filters ) {
				params.gsrsearch += ' ' + filters;
			}

			switch ( options.type ) {
				case 'video':
					urlWidth = 200;
					break;

				case 'other':
					urlWidth = 120;
					break;
			}

			params.gsrnamespace = 6; // NS_FILE
			params.iiprop = 'url|size|mime';
			params.iiurlheight = options.type === 'bitmap' ? 180 : undefined;
			params.iiurlwidth = urlWidth;
			params.wbptterms = 'label';
			params.mediasearch = true; // @todo this is temporary to force the use of the mediasearch profile
		}

		// Add sort filter.
		if ( 'sort' in context.state.filterValues[ options.type ] &&
			context.state.filterValues[ options.type ].sort === 'recency' ) {
			params.gsrsort = 'create_timestamp_desc';
		}

		// If a search request is already in-flight, abort it
		if ( activeRequest ) {
			activeRequest.abort();
		}

		// Set the pending state for the given queue
		context.commit( 'setPending', {
			type: options.type,
			pending: true
		} );

		// request = $.get( 'https://commons.wikimedia.org/w/api.php', params ); // for testing
		request = api.get( params );

		request.promise( {
			abort: function () {
				request.abort();
			}
		} );

		activeRequest = request;

		return request.then( function ( response ) {
			var results, pageIDs, sortedResults;

			if ( response.query && response.query.pages ) {
				results = response.query.pages;
				pageIDs = Object.keys( results );

				// Sort the results within each batch prior to committing them
				// to the store
				sortedResults = pageIDs.map( function ( id ) {
					return results[ id ];
				} ).sort( function ( a, b ) {
					return a.index - b.index;
				} );

				sortedResults.forEach( function ( result ) {
					context.commit( 'addResult', {
						type: options.type,
						item: result
					} );
				} );
			}

			// Set whether or not the query can be continued
			if ( response.continue ) {
				// Store the "continue" property of the request so we can pick up where we left off
				context.commit( 'setContinue', {
					type: options.type,
					continue: response.continue.gsroffset
				} );
			} else {
				context.commit( 'setContinue', {
					type: options.type,
					continue: null
				} );
			}
		} ).done( function () {
			activeRequest = null;
			// Set pending back to false when request is complete
			context.commit( 'setPending', {
				type: options.type,
				pending: false
			} );
		} );
	}
};
