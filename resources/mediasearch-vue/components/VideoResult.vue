<template>
	<div class="wbmi-video-result" @click="showDetails">
		<img
			:src="thumbnail"
			:alt="title"
			class="wbmi-video-result__thumbnail"
			loading="lazy"
		>

		<div class="wbmi-video-result__body">
			<h3 class="wbmi-video-result__title">
				<a :href="canonicalurl"
					@click.prevent="showDetails">
					{{ name || title }}
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
		mime: function () {
			return this.imageinfo[ 0 ].mime;
		},

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
@import '../../../lib/wikimedia-ui-base.less';

.wbmi-video-result {
	.flex-display();
	.flex-wrap( nowrap );
	box-sizing: border-box;
	border: solid 1px @wmui-color-base70;
	border-radius: @border-radius-base;
	cursor: pointer;
	flex-direction: column;
	margin: 8px;

	&:hover {
		.box-shadow( 4px 4px 5px -2px @border-color-base );
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
		padding: 8px;

		& .wbmi-video-result__title {
			line-height: @line-height-heading;
			margin-top: 0;
			padding-top: 0;
		}
	}

	&__duration {
		border-radius: @border-radius-base;
		color: @color-base--subtle;
		display: inline-block;
		background-color: @wmui-color-base80;
		font-weight: normal;
		padding: 0 4px;
		margin-right: 8px;
	}

	&__mime {
		color: @color-base--subtle;
		font-weight: normal;
	}
}
</style>
