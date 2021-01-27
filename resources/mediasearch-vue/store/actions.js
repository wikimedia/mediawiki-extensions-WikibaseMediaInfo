'use strict';

var LIMIT = 40,
	api = new mw.Api(),
	activeSearchRequest = null,
	activeConceptsRequest = null;

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
	raw += addFilter( 'license', 'haslicense' );

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
				gsrinfo: 'totalhits',
				prop: options.type === 'page' ? 'info|categoryinfo' : 'info|imageinfo|entityterms',
				inprop: 'url'
			},
			namespaces = mw.config.get( 'wgNamespaceIds' ),
			filters,
			urlWidth,
			request;

		if ( options.type === 'page' ) {
			// Page/category-specific params.
			params.gsrnamespace = Object.keys( namespaces )
				.map( function ( key ) {
					return namespaces[ key ];
				} )
				.filter( function ( id, i, ids ) {
					return (
						// exclude virtual namespaces
						id >= 0 &&
						// exclude file namespace
						( !( 'file' in namespaces ) || id !== namespaces.file ) &&
						// exclude duplicates (namespace ids known under multiple aliases)
						ids.indexOf( id ) === i
					);
				} )
				.join( '|' );
		} else {
			// Params used in all non-page/category searches.
			filters = getMediaFilters( options.type, context.state.filterValues[ options.type ] );
			if ( filters ) {
				params.gsrsearch = filters + ' ' + params.gsrsearch;
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
			params.wbetterms = 'label';
			params.mediasearch = true; // @todo this is temporary to force the use of the mediasearch profile
		}

		// Add sort filter.
		if ( 'sort' in context.state.filterValues[ options.type ] &&
			context.state.filterValues[ options.type ].sort === 'recency' ) {
			params.gsrsort = 'create_timestamp_desc';
		}

		// If a search request is already in-flight, abort it
		if ( activeSearchRequest ) {
			activeSearchRequest.abort();
		}

		// Set the pending state for the given queue
		context.commit( 'setPending', {
			type: options.type,
			pending: true
		} );

		request = mw.config.get( 'wbmiLocalDev' ) ?
			$.get( 'https://commons.wikimedia.org/w/api.php', params ) : // local testing
			api.get( params ); // real

		request.promise( {
			abort: function () {
				request.abort();
			}
		} );

		activeSearchRequest = request;

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

				if ( response.query.searchinfo && response.query.searchinfo.totalhits ) {
					context.commit( 'setTotalHits', {
						mediaType: options.type,
						totalHits: response.query.searchinfo.totalhits
					} );
				}
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
			activeSearchRequest = null;
			// Set pending back to false when request is complete
			context.commit( 'setPending', {
				type: options.type,
				pending: false
			} );
		} );
	},

	/**
	 * Fetch data for concept chips.
	 *
	 * @param {Object} context
	 * @param {string} term
	 * @return {jQuery.Deferred}
	 */
	getRelatedConcepts: function ( context, term ) {
		var params = {
				format: 'json',
				uselang: mw.config.get( 'wgUserLanguage' ),
				action: 'relatedconcepts',
				term: term,
				limit: 10
			},
			request;

		// Abort in-flight request, if it exists.
		if ( activeConceptsRequest ) {
			activeConceptsRequest.abort();
		}

		request = api.get( params );
		request.promise( {
			abort: function () {
				request.abort();
			}
		} );
		activeConceptsRequest = request;

		return request.then( function ( response ) {
			activeConceptsRequest = null;

			if ( response.query && response.query.relatedconcepts && response.query.relatedconcepts.length > 0 ) {
				context.commit( 'setRelatedConcepts', response.query.relatedconcepts );
			}
		} );
	},

	/**
	 * Handle search term clear.
	 *
	 * @param {Object} context
	 */
	clear: function ( context ) {
		if ( activeSearchRequest ) {
			activeSearchRequest.abort();
			activeSearchRequest = null;
		}

		if ( activeConceptsRequest ) {
			activeConceptsRequest.abort();
			activeConceptsRequest = null;
		}

		context.commit( 'clearTerm' );
		context.commit( 'clearRelatedConcepts' );
		context.commit( 'resetFilters' );
		context.commit( 'resetResults' );
	},

	/**
	 * @param {Object} context
	 */
	ready: function ( context ) {
		context.commit( 'setInitialized' );
	}
};
