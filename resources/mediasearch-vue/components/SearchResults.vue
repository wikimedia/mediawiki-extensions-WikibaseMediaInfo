<template>
	<div class="wbmi-media-search-results">
		<div :class="'wbmi-media-search-results__list--' + mediaType"
			class="wbmi-media-search-results__list">
			<component
				:is="resultComponent"
				v-for="(result, index) in sortedResults[ mediaType ]"
				:key="index"
				v-bind="result"
				@show-details="showDetails">
			</component>
		</div>

		<aside class="wbmi-media-search-results__details"
			:class="{ 'wbmi-media-search-results__details--expanded': !!details }">
			<quick-view
				v-if="details"
				v-bind="details"
				@close="hideDetails">
			</quick-view>
		</aside>
	</div>
</template>

<script>
/**
 * @file SearchResults.vue
 *
 * The SearchResults component is responsible for displaying a list or grid of
 * search results, regardless of media type. Appearance and behavior will vary
 * depending on the value of the mediaType prop.
 *
 * The SearchResults component is also responsible for displaying an expanded
 * preview for a specific result if triggered by user actions.
 */
var mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	ImageResult = require( './ImageResult.vue' ),
	VideoResult = require( './VideoResult.vue' ),
	GenericResult = require( './GenericResult.vue' ),
	QuickView = require( './QuickView.vue' );

// @vue/component
module.exports = {
	name: 'SearchResults',

	components: {
		'image-result': ImageResult,
		'video-result': VideoResult,
		'generic-result': GenericResult,
		'quick-view': QuickView
	},

	props: {
		mediaType: {
			type: String,
			required: true
		}
	},

	data: function () {
		return {
			details: null
		};
	},

	computed: $.extend( {}, mapState( [
		'term',
		'results',
		'pending'
	] ), mapGetters( [
		'sortedResults'
	] ), {
		/**
		 * Which component should be used to display individual search results
		 *
		 * @return {string} image-result|video-result|generic-result
		 */
		resultComponent: function () {
			if ( this.mediaType === 'bitmap' ) {
				return 'image-result';
			} else if ( this.mediaType === 'video' ) {
				return 'video-result';
			} else {
				return 'generic-result';
			}
		}
	} ),

	methods: {
		/**
		 * Store the results of the fetchDetails API request as `this.details`
		 * so that it can be passed to the QuickView component.
		 *
		 * @param {number} pageid
		 */
		showDetails: function ( pageid ) {
			// @TODO show a placeholder Quickview UI immediately, and then
			// replace with the real data as soon as the request has completed
			this.fetchDetails( pageid ).then( function ( response ) {
				this.details = response.query.pages[ pageid ];
			}.bind( this ) );
		},

		/**
		 * Reset details data to null
		 */
		hideDetails: function () {
			this.details = null;
		},

		/**
		 * Make an API request for basic image information plus extended
		 * metadata
		 *
		 * @param {number} pageid
		 * @return {jQuery.Deferred}
		 */
		fetchDetails: function ( pageid ) {
			var params = {
				format: 'json',
				uselang: mw.config.get( 'wgUserLanguage' ),
				action: 'query',
				prop: 'info|imageinfo|pageterms',
				iiprop: 'url|size|mime|extmetadata',
				iiurlheight: this.mediaType === 'bitmap' ? 180 : undefined,
				iiurlwidth: this.mediaType === 'video' ? 200 : undefined,
				inprop: 'url',
				pageids: pageid
			};

			// Real version: use mw.api
			// return api.get( params ).then( function ( response ) {
			// } );

			// Test version: use production commons API
			return $.get( 'https://commons.wikimedia.org/w/api.php', params );
		}
	},

	watch: {
		// if search term changes, immediately discard any expanded detail view
		term: function ( /* newTerm */ ) {
			this.details = null;
		}
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../../lib/wikimedia-ui-base.less';

.wbmi-media-search-results {
	.flex-display();
	.flex-wrap( nowrap );

	// The "list" part of search results should always fill all available space.
	// By default lists will display results in a single column.
	&__list {
		.flex( 1, 1, auto );

		// Lists of type "bitmap" or "video" display their results in a grid
		// and are allowed to wrap.
		&--bitmap,
		&--video {
			.flex-display();
			.flex-wrap( wrap );

			> * {
				&:last-child {
					.flex( 0, 1, auto );
				}
			}
		}

		// Video results are displayed as tiles/cards with a uniform size
		&--video {
			// stylelint-disable-next-line no-descending-specificity
			> * {
				.flex( 1, 0, 15% );
			}
		}

		// Image results are arranged flush in a "masonry" style layout that
		// attempts to do as little cropping as possible.
		// @TODO on mobile, image grid should switch to vertical columns with
		// fixed width instead of horizontal rows with fixed height.
		&--bitmap {
			// stylelint-disable-next-line no-descending-specificity
			> * {
				.flex( 1, 1, auto );
			}
		}
	}

	// The "details" part of search result (container for QuickView) is
	// collapsed by default, but can expand to 50% or a set max-width, whichever
	// is smaller
	&__details {
		.flex( 0, 0, auto );
		max-width: 30rem;
		width: 0%;

		&--expanded {
			.flex( 1, 0, auto );
			width: 50%;
		}
	}
}
</style>
