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
		}
	},

	methods: {
		/**
		 * @fires show-details
		 */
		showDetails: function () {
			this.$emit( 'show-details', this.pageid );
		}
	}
};
