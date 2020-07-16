<template>
	<div class="wbmi-media-search-results">
		<div :class="'wbmi-media-search-results__list--' + mediaType"
			class="wbmi-media-search-results__list">
			<component
				:is="resultComponent"
				v-for="(result, index) in results[ mediaType ]"
				:key="index"
				v-bind="result">
			</component>
		</div>
	</div>
</template>

<script>
/**
 * @file SearchResults.vue
 *
 * The SearchResults component is responsible for displaying a list or grid of
 * search results, regardless of media type. Appearance and behavior will vary
 * depending on the value of the mediaType prop.
 */
var mapState = require( 'vuex' ).mapState,
	ImageResult = require( './ImageResult.vue' ),
	AudioResult = require( './AudioResult.vue' ),
	VideoResult = require( './VideoResult.vue' ),
	GenericResult = require( './GenericResult.vue' );

// @vue/component
module.exports = {
	name: 'SearchResults',

	components: {
		'image-result': ImageResult,
		'video-result': VideoResult,
		'audio-result': AudioResult,
		'generic-result': GenericResult
	},

	props: {
		mediaType: {
			type: String,
			required: true
		}
	},

	computed: $.extend( {}, mapState( [
		'term',
		'results',
		'pending'
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
			} else if ( this.mediaType === 'audio' ) {
				return 'audio-result';
			} else {
				return 'generic-result';
			}
		}
	} )
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

.wbmi-media-search-results {
	.flex-display();
	.flex-wrap( nowrap );

	// The "list" part of search results should always fill all available space.
	// By default lists will display results in a single column.
	&__list {
		.flex( 1, 1, auto );
		margin: @wbmi-spacing-sm;

		// Audio results are limited to half-width
		&--audio {
			> * {
				max-width: @max-width-base;
			}
		}

		// Video results are displayed as tiles/cards with a uniform size
		&--video {
			.flex-display();
			.flex-wrap( wrap );
			justify-content: flex-start;

			// stylelint-disable-next-line no-descending-specificity
			> * {
				.flex( 0, 0, 260px );
			}
		}

		// Image results are arranged flush in a "masonry" style layout that
		// attempts to do as little cropping as possible.
		// @TODO on mobile, image grid should switch to vertical columns with
		// fixed width instead of horizontal rows with fixed height.
		&--bitmap {
			.flex-display();
			.flex-wrap( wrap );
			// stylelint-disable-next-line no-descending-specificity
			> * {
				.flex( 1, 1, auto );

				&:last-child {
					.flex( 0, 1, auto );
				}
			}
		}
	}
}
</style>
