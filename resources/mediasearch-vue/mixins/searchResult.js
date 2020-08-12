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

		terms: {
			type: Object,
			required: false
		}
	},

	computed: {
		/**
		 * @return {string|undefined}
		 */
		thumbnail: function () {
			return this.imageinfo[ 0 ].thumburl;
		},

		/**
		 * @return {string|undefined}
		 */
		src: function () {
			return this.imageinfo[ 0 ].url;
		},

		label: function () {
			if ( this.terms && this.terms.label ) {
				return this.terms.label[ 0 ];
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
			// Stop the original event (most likely a "click") from
			// propagating in case other scripts (user scripts, etc)
			// are listening. See https://phabricator.wikimedia.org/T260203
			// for an example.
			e.stopPropagation();

			this.$emit( 'show-details', this.pageid, e.target.href );
		},

		/**
		 * Programatically focus the result's link element (must be given a
		 * "ref" in the component template)
		 */
		focus: function () {
			this.$refs.link.focus();
		}
	}
};
