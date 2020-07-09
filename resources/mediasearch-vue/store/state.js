'use strict';

var initialResults = mw.config.get( 'wbmiInitialSearchResults' ),
	initialTerm = new mw.Uri().query.q || '';

// TODO: Remove this, it's just a workaround for now
// while we use data from Production commons to test features locally
function ensureArray( obj ) {
	if ( Array.isArray( obj ) ) {
		return obj;
	} else {
		// eslint-disable-next-line es/no-object-values
		return Object.values( obj );
	}
}

module.exports = {
	/**
	 * string search term
	 */
	term: initialTerm,

	/**
	 * Arrays of objects broken down by type
	 */
	results: {
		bitmap: ensureArray( initialResults.bitmap.results ),
		audio: ensureArray( initialResults.audio.results ),
		video: ensureArray( initialResults.video.results ),
		category: ensureArray( initialResults.category.results )
	},

	continue: {
		bitmap: initialResults.bitmap.continue,
		audio: initialResults.audio.continue,
		video: initialResults.video.continue,
		category: initialResults.category.continue
	},

	pending: {
		bitmap: false,
		audio: false,
		video: false,
		category: false
	}
};
