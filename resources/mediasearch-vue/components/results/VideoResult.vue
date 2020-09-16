<template>
	<a ref="link"
		class="wbmi-video-result"
		:href="canonicalurl"
		target="_blank"
		:title="title"
		@click.prevent="showDetails">

		<img
			:src="thumbnail"
			:alt="displayName"
			class="wbmi-video-result__thumbnail"
			loading="lazy"
		>

		<div class="wbmi-video-result__body">
			<h3 class="wbmi-video-result__title">
				{{ displayName }}
			</h3>

			<h4 v-if="formattedDuration || mime" class="wbmi-video-result__meta">
				<span v-if="formattedDuration" class="wbmi-video-result__duration">
					{{ formattedDuration }}
				</span>
				<span v-if="mime" class="wbmi-video-result__mime">
					{{ mime }}
				</span>
			</h4>
		</div>
	</a>
</template>

<script>
/**
 * @file VideoResult.vue
 *
 * Video-specific search result layout. Implements the general searchResult
 * mixin as well as the "time-based" result mixin. Also includes custom
 * computed properties for resolution and mime type.
 */
var searchResult = require( '../../mixins/searchResult.js' ),
	searchResultTimeBased = require( '../../mixins/searchResultTimeBased.js' );

// @vue/component
module.exports = {
	name: 'VideoResult',

	mixins: [
		searchResult,
		searchResultTimeBased
	],

	computed: {
		/**
		 * @return {string}
		 */
		resolution: function () {
			var width = this.imageinfo[ 0 ].width,
				height = this.imageinfo[ 0 ].height;

			return width + 'x' + height;
		}
	}
};
</script>
