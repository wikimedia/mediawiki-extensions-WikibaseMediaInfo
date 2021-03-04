module.exports = {
	/**
	 * Whether a media type may have more results
	 *
	 * If we do a search and there is no continue offset, the value in state is
	 * set to null for that tab. If this hasn't happened, we know there either
	 * are more results or there could be.
	 *
	 * @param {Object} state
	 * @return {Object}
	 */
	checkForMore: function ( state ) {
		return {
			image: state.continue.image !== null,
			audio: state.continue.audio !== null,
			video: state.continue.video !== null,
			page: state.continue.page !== null,
			other: state.continue.other !== null
		};
	},

	allActiveFilters: function ( state ) {
		return JSON.stringify( state.filterValues );
	}
};
