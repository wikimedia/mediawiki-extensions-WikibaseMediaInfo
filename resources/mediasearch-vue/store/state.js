'use strict';

var initialResults = mw.config.get( 'wbmiInitialSearchResults' );

module.exports = {
	/**
	 * Arrays of objects broken down by type
	 */
	results: {
		bitmap: initialResults.bitmap.results,
		audio: initialResults.audio.results,
		video: initialResults.video.results,
		category: initialResults.category.results
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
