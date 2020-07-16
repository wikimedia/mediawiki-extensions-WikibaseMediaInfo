<template>
	<div class="wbmi-video-result">
		<img
			:src="thumbnail"
			:alt="displayName"
			class="wbmi-video-result__thumbnail"
			loading="lazy"
		>

		<div class="wbmi-video-result__body">
			<h3 class="wbmi-video-result__title">
				<a :href="canonicalurl"
					target="_blank"
					:title="title">
					{{ displayName }}
				</a>
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
	</div>
</template>

<script>
/**
 * @file VideoResult.vue
 *
 * Video-specific search result layout. Implements the general searchResult
 * mixin as well as the "time-based" result mixin. Also includes custom
 * computed properties for resolution and mime type.
 */
var searchResult = require( '../mixins/searchResult.js' ),
	searchResultTimeBased = require( '../mixins/searchResultTimeBased.js' );

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

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

.wbmi-video-result {
	.flex-display();
	.flex-wrap( nowrap );
	box-sizing: border-box;
	border: solid 1px @wmui-color-base70;
	border-radius: @border-radius-base;
	cursor: pointer;
	flex-direction: column;
	margin: @wbmi-spacing-sm;

	&:hover {
		.wbmi-result-box-shadow();
	}

	&__thumbnail {
		background-color: #000;
		object-fit: contain;
		height: 150px;
		width: 100%;
	}

	&__body {
		.flex-display();
		.flex( 1, 0, auto );
		flex-direction: column;
		padding: @wbmi-spacing-sm;

		& .wbmi-video-result__title {
			line-height: @line-height-heading;
			margin-top: 0;
			padding-top: 0;

			& a:hover {
				text-decoration: none;
			}
		}
	}

	&__duration {
		border-radius: @border-radius-base;
		color: @color-base--subtle;
		display: inline-block;
		background-color: @wmui-color-base80;
		font-weight: normal;
		padding: 0 @wbmi-spacing-xs;
		margin-right: @wbmi-spacing-sm;
	}

	&__mime {
		color: @color-base--subtle;
		font-weight: normal;
	}
}
</style>
