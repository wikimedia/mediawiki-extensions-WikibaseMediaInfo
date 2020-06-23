'use strict';

var AnonWarning = {
	notified: false,

	notify: function () {
		// Hack to wrap our (rich) message in jQuery so mw.notify inserts it as HTML, not text
		var $msg = $( mw.config.get( 'wbmiParsedMessageAnonEditWarning' ) );
		mw.notify( $msg, {
			autoHide: false,
			type: 'warn',
			tag: 'wikibasemediainfo-anonymous-edit-warning'
		} );

		this.notified = true;
	},

	notifyOnce: function () {
		if ( !this.notified ) {
			this.notify();
		}
	}
};

module.exports = AnonWarning;
