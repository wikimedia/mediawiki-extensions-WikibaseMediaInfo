module.exports = {
	hasMore: function ( state ) {
		return {
			bitmap: state.continue.bitmap !== null,
			audio: state.continue.audio !== null,
			video: state.continue.video !== null,
			category: state.continue.category !== null
		};
	}
};
