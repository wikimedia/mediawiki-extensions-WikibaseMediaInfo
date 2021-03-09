'use strict';

var initialResults = mw.config.get( 'wbmiInitialSearchResults' ),
	initialFilters = JSON.parse( mw.config.get( 'wbmiInitialFilters' ) ),
	didYouMean = mw.config.get( 'wbmiDidYouMean' ),
	// TODO: Remove this, it's just a workaround for now
	// while we use data from Production commons to test features locally
	ensureArray = function ( obj ) {
		if ( Array.isArray( obj ) ) {
			return obj;
		} else {
			return Object.keys( obj ).map( function ( key ) {
				return obj[ key ];
			} );
		}
	},
	sortedResults = ensureArray( initialResults.results || [] ).sort( function ( a, b ) {
		return a.index - b.index;
	} ),
	// grab straight from existing input field in case already user started changing input
	// before JS loaded, and disable right away to prevent further input
	// eslint-disable-next-line no-jquery/no-global-selector
	initialTerm = $( '#wbmi-media-search-input__input' ).prop( 'disabled', true ).val() || '';

module.exports = {
	/**
	 * string search term
	 */
	term: initialTerm,

	relatedConcepts: [],

	/**
	 * Suggested alternate search term, if any
	 */
	didYouMean: didYouMean,

	/**
	 * Boolean flag indicating whether the search has errored
	 */
	hasError: mw.config.get( 'wbmiHasError' ),

	/**
	 * Arrays of objects broken down by type
	 */
	results: {
		bitmap: initialResults.activeType === 'bitmap' ? sortedResults : [],
		audio: initialResults.activeType === 'audio' ? sortedResults : [],
		video: initialResults.activeType === 'video' ? sortedResults : [],
		page: initialResults.activeType === 'page' ? sortedResults : [],
		other: initialResults.activeType === 'other' ? sortedResults : []
	},

	/**
	 * Per-tab value for continue will be one of 3 things:
	 * 1. Offset value where the next batch of results should start (string)
	 * 2. undefined (representing that we don't know if there are more
	 *    results because we haven't done a search API call yet)
	 * 3. null (representing that there are no more results)
	 */
	continue: {
		bitmap: initialResults.activeType === 'bitmap' ? initialResults.continue : undefined,
		audio: initialResults.activeType === 'audio' ? initialResults.continue : undefined,
		video: initialResults.activeType === 'video' ? initialResults.continue : undefined,
		page: initialResults.activeType === 'page' ? initialResults.continue : undefined,
		other: initialResults.activeType === 'other' ? initialResults.continue : undefined
	},

	pending: {
		bitmap: false,
		audio: false,
		video: false,
		page: false,
		other: false
	},

	/**
	 * Total number of search results.
	 */
	totalHits: {
		bitmap: initialResults.activeType === 'bitmap' ? initialResults.totalHits : 0,
		audio: initialResults.activeType === 'audio' ? initialResults.totalHits : 0,
		video: initialResults.activeType === 'video' ? initialResults.totalHits : 0,
		page: initialResults.activeType === 'page' ? initialResults.totalHits : 0,
		other: initialResults.activeType === 'other' ? initialResults.totalHits : 0
	},

	filterValues: {
		bitmap: initialResults.activeType === 'bitmap' ? initialFilters : {},
		audio: initialResults.activeType === 'audio' ? initialFilters : {},
		video: initialResults.activeType === 'video' ? initialFilters : {},
		page: initialResults.activeType === 'page' ? initialFilters : {},
		other: initialResults.activeType === 'other' ? initialFilters : {}
	},

	/**
	 * Whether the app is fully initialized (app mounted, images resolved).
	 */
	initialized: false
};
