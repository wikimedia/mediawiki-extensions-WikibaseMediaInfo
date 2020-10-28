'use strict';

var initialResults = mw.config.get( 'wbmiInitialSearchResults' ),
	ensureArray = function ( obj ) {
		// TODO: Remove this, it's just a workaround for now
		// while we use data from Production commons to test features locally
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
	 * Arrays of objects broken down by type
	 */
	results: {
		bitmap: initialResults.activeType === 'bitmap' ? sortedResults : [],
		audio: initialResults.activeType === 'audio' ? sortedResults : [],
		video: initialResults.activeType === 'video' ? sortedResults : [],
		page: initialResults.activeType === 'page' ? sortedResults : [],
		other: initialResults.activeType === 'other' ? sortedResults : []
	},

	continue: {
		bitmap: initialResults.activeType === 'bitmap' ? initialResults.continue : 0,
		audio: initialResults.activeType === 'audio' ? initialResults.continue : 0,
		video: initialResults.activeType === 'video' ? initialResults.continue : 0,
		page: initialResults.activeType === 'page' ? initialResults.continue : 0,
		other: initialResults.activeType === 'other' ? initialResults.continue : 0
	},

	pending: {
		bitmap: false,
		audio: false,
		video: false,
		page: false,
		other: false
	},

	filterValues: {
		bitmap: {},
		audio: {},
		video: {},
		page: {},
		other: {}
	},

	/**
	 * Whether the app is fully initialized (app mounted, images resolved).
	 */
	initialized: false
};
