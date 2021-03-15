/**
 * @file searchResult.js
 *
 * Re-usable mixin for search result components. Individual Result components
 * that implement this mixin can decide for themselves how all this information
 * should be disiplayed.
 *
 * This mixin is deliberately "dumb" (contains no local state) so that search
 * result components which include it can be written as stateless functional
 * components if necessary.
 */
module.exports = {
	props: {
		title: {
			type: String,
			required: true
		},

		canonicalurl: {
			type: String,
			required: true
		},

		pageid: {
			type: Number,
			required: true
		},

		imageinfo: {
			type: Array,
			required: false,
			default: function () {
				return [ {} ];
			}
		},

		index: {
			type: Number,
			required: true
		},

		name: {
			type: String,
			required: false
		},

		entityterms: {
			type: Object,
			required: false
		}
	},

	computed: {
		/**
		 * @return {string|undefined}
		 */
		thumbnail: function () {
			var commonWidths = mw.config.get( 'wbmiThumbLimits' ),
				oldWidth = this.imageinfo[ 0 ].thumbwidth,
				newWidth = oldWidth,
				i;

			// find the closest (larger) width that is more common, it is (much) more
			// likely to have a thumbnail cached
			for ( i = 0; i < commonWidths.length; i++ ) {
				if ( commonWidths[ i ] >= oldWidth ) {
					newWidth = commonWidths[ i ];
					break;
				}
			}

			return this.imageinfo[ 0 ].thumburl.replace( '/' + oldWidth + 'px-', '/' + newWidth + 'px-' );
		},

		/**
		 * @return {string|undefined}
		 */
		src: function () {
			return this.imageinfo[ 0 ].url;
		},

		label: function () {
			if ( this.entityterms && this.entityterms.label ) {
				return this.entityterms.label[ 0 ];
			} else {
				return null;
			}
		},

		/**
		 * Use mw.Title to get a normalized title without File, Category, etc. prepending
		 *
		 * @return {string}
		 */
		displayName: function () {
			return new mw.Title( this.title ).getMainText();
		}
	},

	methods: {
		/**
		 * @param {Event} e
		 * @fires show-details
		 */
		showDetails: function ( e ) {
			// Allow cmd + click/Windows + click to open file page in new tab.
			if ( e.metaKey === true ) {
				return;
			}

			e.preventDefault();

			// Stop the original event (most likely a "click") from
			// propagating in case other scripts (user scripts, etc)
			// are listening. See https://phabricator.wikimedia.org/T260203
			// for an example.
			e.stopPropagation();
			this.$emit( 'show-details', this.pageid );
		},

		/**
		 * Programatically focus the result's link element (must be given a
		 * "ref" in the component template)
		 */
		focus: function () {
			this.$refs.link.focus();
		},

		/**
		 * Format a file size into something readable.
		 *
		 * Adapted from Special:Upload code in MediaWiki core. This isn't a
		 * perfect solution—for example, it will use a dot as the decimal
		 * separator, which isn't how it's done in every language—but it gets
		 * us most of the way there without reimplementing the lengthy and
		 * complex Language::formatNum method.
		 *
		 * @param {number} size
		 * @return {string} Size to the hundreths place plus units
		 */
		formatSize: function ( size ) {
			var decimalPlace = 1,
				sizeMsgs = [ 'size-bytes', 'size-kilobytes', 'size-megabytes', 'size-gigabytes' ],
				sizeDigitsInLanguage;

			while ( size >= 1024 && sizeMsgs.length > 1 ) {
				size /= 1024;
				sizeMsgs = sizeMsgs.slice( 1 );
			}

			// To match what the Language::formatSize method is doing, we'll
			// only show decimal places for MB and larger.
			if ( sizeMsgs.length <= 2 ) {
				decimalPlace = 100;
			}

			// Ensure that the rounded numerical digits fed to the size messages
			// are provided in the appropriate language; Bangle and Farsi must
			// not use Arabic numbers for example. https://phabricator.wikimedia.org/T274614
			sizeDigitsInLanguage = mw.language.convertNumber(
				Math.round( size * decimalPlace ) / decimalPlace
			);

			// The following messages are used here:
			// * size-bytes
			// * size-kilobytes
			// * size-megabytes
			// * size-gigabytes
			return mw.msg( sizeMsgs[ 0 ], sizeDigitsInLanguage );
		},

		/**
		 * Format a number per-language (e.g. adding separators).
		 *
		 * @param {number} number
		 * @return {string}
		 */
		formatNumber: function ( number ) {
			return number.toLocaleString( mw.config.get( 'wgUserLanguage' ) );
		}
	}
};
