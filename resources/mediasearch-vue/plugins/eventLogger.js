/**
 * Event logging plugin for Vue that connects with MediaWiki's Modern Event
 * Platform
 */

module.exports = {
	install: function ( Vue, options ) {
		var stream = options.stream,
			schema = options.schema,
			token = mw.user.getPageviewToken();

		/* eslint-disable camelcase */
		Vue.prototype.$log = function ( event ) {
			event.$schema = schema;
			event.web_pageview_id = token;
			event.language_code = mw.language.getFallbackLanguageChain()[ 0 ];
			event.ui_mw_skin = mw.config.get( 'skin' );

			mw.eventLog.submit( stream, event );
		};
		/* eslint-enable camelcase */
	}
};
