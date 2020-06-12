'use strict';

var initialResults = mw.config.get( 'wbmiInitialSearchResults' );

module.exports = {

	query: '',

	/**
	 * Arrays of objects broken down by type
	 */
	results: {
		bitmap: initialResults.bitmap.results,
		audio: initialResults.audio.results,
		video: initialResults.video.results,
		category: initialResults.category.results
	},

	/**
	 * boolean values broken down by media type
	 */
	hasMore: {
		bitmap: initialResults.bitmap.hasMore,
		audio: initialResults.audio.hasMore,
		video: initialResults.video.hasMore,
		category: initialResults.category.hasMore
	},

	continue: {
		bitmap: initialResults.bitmap.continue,
		audio: initialResults.audio.continue,
		video: initialResults.video.continue,
		category: initialResults.category.continue
	}

};
