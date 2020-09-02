var Vue = require( 'vue' );

module.exports = {

	setTerm: function ( state, newTerm ) {
		state.term = newTerm;
	},

	clearTerm: function ( state ) {
		state.term = '';
	},

	/**
	 * Add a search result to the given queue
	 *
	 * @param {Object} state
	 * @param {Object} payload
	 * @param {Object} payload.queue
	 * @param {Object} payload.item
	 */
	addResult: function ( state, payload ) {
		state.results[ payload.type ].push( payload.item );
	},

	/**
	 * Reset results and related data. If a payload is provided, only reset the
	 * results and related data for a specific media type; otherwise reset all
	 * results.
	 *
	 * @param {Object} state
	 * @param {string} mediaType bitmap, audio, etc
	 */
	resetResults: function ( state, mediaType ) {
		var types = Object.keys( state.results );

		if ( mediaType ) {
			// Reset results for only a single result type if the second arg is
			// provided
			state.results[ mediaType ] = [];
			state.continue[ mediaType ] = '';
		} else {
			// Reset results for all types if second arg is not provided
			types.forEach( function ( type ) {
				state.results[ type ] = [];
				state.continue[ type ] = '';
			} );
		}
	},

	/**
	 * Set the continue status of a given queue (after a request has been made)
	 *
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
	 *
	 * @param {Object} state
	 * @param {Object} payload
	 * @param {Object} payload.type
	 * @param {boolean} payload.pending
	 */
	setPending: function ( state, payload ) {
		state.pending[ payload.type ] = payload.pending;
	},

	setFileCount: function ( state, fileCount ) {
		state.fileCount = fileCount;
	},

	/**
	 * Add a new filter value.
	 *
	 * @param {Object} state
	 * @param {Object} payload
	 * @param {string} payload.value The new value
	 * @param {string} payload.mediaType Which mediaType this is for
	 * @param {string} payload.filterType Which filter this is for
	 */
	addFilterValue: function ( state, payload ) {
		Vue.set( state.filterValues[ payload.mediaType ], payload.filterType, payload.value );
	},

	/**
	 * Set a new filter value.
	 *
	 * @param {Object} state
	 * @param {Object} payload
	 * @param {string} payload.mediaType Which mediaType this is for
	 * @param {string} payload.filterType Which filter this is for
	 */
	removeFilterValue: function ( state, payload ) {
		Vue.delete( state.filterValues[ payload.mediaType ], payload.filterType );
	}
};
