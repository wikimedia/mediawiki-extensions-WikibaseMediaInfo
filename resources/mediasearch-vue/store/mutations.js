module.exports = {

	/**
	 * Add a search result to the given queue
	 * @param {Object} state
	 * @param {Object} payload
	 * @param {Object} payload.queue
	 * @param {Object} payload.item
	 */
	addResult: function ( state, payload ) {
		state.results[ payload.type ].push( payload.item );
	},

	/**
	 * TODO: make this less dumb
	 * @param {Object} state
	 */
	resetResults: function ( state ) {
		state.results.bitmap = [];
		state.results.audio = [];
		state.results.video = [];
		state.results.category = [];

		state.continue.bitmap = '';
		state.continue.audio = '';
		state.continue.video = '';
		state.continue.category = '';
	},

	/**
	 * Set the continue status of a given queue (after a request has been made)
	 * @param {Object} state
	 * @param {Object} payload
	 * @param {string} payload.type
	 * @param {string|null} payload.continue
	 */
	setContinue: function ( state, payload ) {
		state.continue[ payload.type ] = payload.continue;
	},

	/**
	 * Set the pending state of a given queue to true or false
	 * @param {Object} state
	 * @param {Object} payload
	 * @param {Object} payload.type
	 * @param {boolean} payload.pending
	 */
	setPending: function ( state, payload ) {
		state.pending[ payload.type ] = payload.pending;
	}
};
