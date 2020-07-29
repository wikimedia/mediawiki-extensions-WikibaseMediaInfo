<template>
	<a ref="link"
		class="wbmi-video-result"
		:href="canonicalUrl"
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

// Base element is an anchor tag for the sake of keyboard navigation.
.wbmi-video-result {
	.flex-display();
	.flex-wrap( nowrap );
	border-radius: @border-radius-base;
	border: solid 1px @wmui-color-base70;
	box-sizing: border-box;
	color: @color-primary;
	flex-direction: column;
	margin: @wbmi-spacing-sm;
	transition: box-shadow @transition-base ease, outline @transition-base ease;

	// Title is a heading element inside of a link, but we want this to look
	// and behave like link text
	&__title {
		color: @color-primary;
		transition: color @transition-base ease;
	}

	&:hover &__title {
		color: @color-primary--active;
	}

	&:hover,
	&:focus {
		.wbmi-result-box-shadow();
		text-decoration: none;
	}

	// Extra prominence on focus using outline, for users navigating via keyboard
	&:focus {
		outline: solid 2px @color-primary;
		outline-offset: -2px;
	}

	&__thumbnail {
		background-color: #000;
		object-fit: contain;
		height: 150px;
		width: 100%;
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

	&__body {
		.flex-display();
		.flex( 1, 0, auto );
		flex-direction: column;
		padding: @wbmi-spacing-sm;

		& .wbmi-video-result__title {
			line-height: @line-height-heading;
			margin-top: 0;
			padding-top: 0;
		}
	}
}
</style>
