/**
 * @file searchAutocomplete.js
 *
 * Mixin containing logic for search input autocomplete lookups. This component:
 * - Takes in current search input
 * - Makes wbsearchentities calls to get raw potential autocomplete results
 * - Filters out duplicate results
 * - Filters out results that don't include the final word being typed
 * - Trims the list of results to a predetermined limit
 * - Returns an array of these filtered and trimmed results
 */
module.exports = {
	data: function () {
		return {
			debounceTimeoutId: null,
			lookupPromises: null,
			lookupResults: [],
			lookupResultsLimit: 7
		};
	},

	methods: {
		clearLookupResults: function () {
			this.lookupResults = [];
		},

		/**
		 * Get lookup results for current text input.
		 *
		 * @param {string} input
		 */
		getDebouncedLookupResults: function ( input ) {
			clearTimeout( this.debounceTimeoutId );
			this.debounceTimeoutId = setTimeout(
				this.getLookupResults.bind( this, input ),
				250
			);
		},

		/**
		 * Get lookup results for current text input.
		 *
		 * @param {string} input
		 */
		getLookupResults: function ( input ) {
			// String.prototype.trim doesn't have quite the browser support that
			// we need, so just do it the long way. Regex taken from
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/trim.
			var trimmedInput = input.replace( /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '' ),
				words,
				inputRegex;

			// If this is an empty string or just whitespace, bail early.
			if ( trimmedInput.length === 0 ) {
				this.lookupResults = [];
				return;
			}

			if ( 'unicode' in RegExp.prototype ) {
				// below could be a regex literal, but eslint fails to parse the `u` flag...
				// eslint-disable-next-line prefer-regex-literals
				words = trimmedInput.match( new RegExp( '[\\p{L}\\p{M}\\p{N}\\p{S}]+', 'gu' ) ).length;
				inputRegex = new RegExp( '^' + new Array( words + 1 ).join( '[\\p{L}\\p{M}\\p{N}\\p{S}]+.*?' ), 'iu' );
			} else {
				// if browser doesn't support unicode regexes, fall back to simple
				// space/punctuation-based word detection
				words = trimmedInput.match( /[^\s\-.:;,]+/g ).length;
				inputRegex = new RegExp( '^' + new Array( words + 1 ).join( '[^\\s\\-]+[\\s\\-.:;,]*' ), 'i' );
			}

			this.doLookupRequest( trimmedInput )
				.then( function ( results ) {
					this.lookupResults = this.getFilteredLookupResults( results, inputRegex );
				}.bind( this ) );
		},

		/**
		 * Get unfiltered lookup results for text input.
		 *
		 * @param {string} input
		 * @return {Array}
		 */
		doLookupRequest: function ( input ) {
			// eslint-disable-next-line prefer-regex-literals
			var lastWordRegex = 'unicode' in RegExp.prototype ? new RegExp( '[\\p{L}\\p{M}\\p{N}\\p{S}]+$', 'u' ) : /[^\s\-.:;,]+$/,
				lastWord = input.match( lastWordRegex ),
				inputPromise,
				promises = [],
				lastWordPromise;

			// Abort in-flight lookup promises to ensure the results provided
			// are for the most recent search input.
			if ( this.lookupPromises ) {
				this.lookupPromises.abort();
			}

			// First, get results for the entire search input.
			inputPromise = this.getLookupRequestForTerm( input );
			promises.push(
				inputPromise.then( function ( response ) {
					return response.search.map( function ( result ) {
						// Get search term that matched (could be label or alias or...)
						return result.match.text;
					} );
				} ).promise( { abort: inputPromise.abort } )
			);

			// Next, if there's more than 1 word, get results for just the last
			// word. Results for the entire search term will still be preferred
			// but this can help return more relevant results for some queries,
			// e.g. when the second word is more specific or meaningful than the
			// first.
			if ( lastWord && lastWord[ 0 ] && input !== lastWord[ 0 ] ) {
				lastWordPromise = this.getLookupRequestForTerm( lastWord[ 0 ] );
				promises.push(
					lastWordPromise.then( function ( response ) {
						return response.search.map( function ( result ) {
							// Add search term to rest of the input.
							return input.replace( lastWordRegex, result.match.text );
						} );
					} ).promise( { abort: lastWordPromise.abort } )
				);
			}

			// Combine the promises and add an abort function so we can cancel
			// this if the search input is updated (i.e. continued typing).
			this.lookupPromises = $.when.apply( $, promises )
				.then( function () {
					// Combine the results of multiple API calls.
					return [].slice.call( arguments ).reduce( function ( combined, results ) {
						return combined.concat( results );
					}, [] );
				} ).promise( { abort: function () {
					promises.forEach( function ( promise ) {
						promise.abort();
					} );
				} } );

			return this.lookupPromises;
		},

		/**
		 * Set up a wbsearchentities API call for an input string.
		 *
		 * @param {string} term
		 * @return {jQuery.promise}
		 */
		getLookupRequestForTerm: function ( term ) {
			var apiUri = mw.config.get( 'wbmiExternalEntitySearchBaseUri' ) ||
					mw.config.get( 'wbmiRepoApiUrl' ) ||
					mw.config.get( 'wbRepoApiUrl' ),
				api = mw.config.get( 'wbmiLocalDev' ) ?
					new mw.Api( { ajax: { url: 'https://www.wikidata.org/w/api.php' } } ) :
					wikibase.api.getLocationAgnosticMwApi( apiUri, { anonymous: true } );

			return api.get( {
				action: 'wbsearchentities',
				search: term,
				format: 'json',
				language: mw.config.get( 'wgUserLanguage' ),
				uselang: mw.config.get( 'wgUserLanguage' ),
				type: 'item',
				// request more than our limit, so we can omit duplicates
				limit: 50
			} );
		},

		/**
		 * Filter results.
		 *
		 * @param {Array} lookupResults All lookup results
		 * @param {string} inputRegex Regex for isolating last word
		 * @return {Array}
		 */
		getFilteredLookupResults: function ( lookupResults, inputRegex ) {
			return lookupResults.map( function ( result ) {
				// Only suggest completion for the word currently being typed.
				return result.match( inputRegex )[ 0 ];
			} )
				// Filter for unique values.
				// Could do a simple `indexOf` to see if a value already exists
				// but that'd be case-sensitive, and since case doesn't matter
				// for search terms, we shouldn't be showing the same term in
				// different capitalization if it's going to give the same results.
				.filter( function ( value, i, array ) {
					return !array.slice( 0, i ).some( function ( previousValue ) {
						return previousValue.toLowerCase() === value.toLowerCase();
					} );
				} )
				// Return a limited number of results to show the user.
				.slice( 0, this.lookupResultsLimit );
		}
	}
};
