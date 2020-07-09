/**
 * @file searchResultTimeBased.js
 *
 * Additional computed properties that are useful for time-based media (video
 * and audio files)
 */

module.exports = {
	computed: {
		duration: function () {
			if ( this.imageinfo && this.imageinfo[ 0 ].duration ) {
				return Math.round( this.imageinfo[ 0 ].duration );
			} else {
				return null;
			}
		},

		formattedDuration: function () {
			var minutes,
				seconds;

			if ( this.duration ) {
				minutes = '0' + Math.floor( this.duration / 60 );
				seconds = '0' + this.duration % 60;
				return minutes.substr( -2 ) + ':' + seconds.substr( -2 );
			} else {
				return null;
			}
		},

		mime: function () {
			return this.imageinfo[ 0 ].mime;
		}
	}
};
