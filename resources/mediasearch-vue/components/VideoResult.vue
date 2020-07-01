<template>
	<div class="wbmi-video-result" @click="showDetails">
		<img
			:src="thumbnail"
			:alt="title"
			class="wbmi-video-result__thumbnail"
			loading="lazy"
		>

		<h6 class="wbmi-video-result__title">
			{{ title }}
		</h6>
	</div>
</template>

<script>
var searchResult = require( '../mixins/searchResult.js' );

// @vue/component
module.exports = {
	name: 'VideoResult',

	mixins: [ searchResult ],

	computed: {
		duration: function () {
			return Math.round( this.imageinfo[ 0 ].duration );
		},

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
	box-sizing: border-box;
	cursor: pointer;
	margin: 8px;
}
</style>
