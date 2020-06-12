'use strict';

/**
 * This is a basic example of a Vue plugin. Plugins add global functionality to
 * Vue. This can be done in several ways: adding global methods or properties,
 * adding custom directives that can be used in templates ("v-whatever"),
 * adding component options via global mixin, and adding instance methods to
 * all Vue components.
 *
 * More information about Vue plugins is available here:
 * https://vuejs.org/v2/guide/plugins.html
 */
module.exports = {
	/**
	 * @param {Object} Vue constructor
	 */
	install: function ( Vue ) {
		/**
		 * Log a user interaction event.
		 * @param {Object} data
		 * @return {jQuery.Promise} jQuery Promise object for the logging call.
		 */
		Vue.prototype.$logEvent = function ( data ) {
			/* eslint-disable camelcase */
			var currentTab = this.$store.state.currentTab,
				event = $.extend( {}, data, {
					image_title: this.$store.getters.currentImageTitle,
					suggestions_count: this.$store.getters.currentImageSuggestions.length,
					is_mobile: mw.config.get( 'skin' ) === 'minerva',
					tab: currentTab === 'user' ? 'personal' : currentTab,
					user_id: mw.user.getId()
				} );
			/* eslint-enable camelcase */

			return mw.eventLog.logEvent( 'SuggestedTagsAction', event );
		};
	}
};
