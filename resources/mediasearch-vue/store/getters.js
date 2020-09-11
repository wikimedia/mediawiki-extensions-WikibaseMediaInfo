module.exports = {
	hasMore: function ( state ) {
		return {
			bitmap: state.continue.bitmap !== null,
			audio: state.continue.audio !== null,
			video: state.continue.video !== null,
			page: state.continue.page !== null
		};
	}
};
