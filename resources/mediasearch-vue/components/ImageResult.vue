<template>
	<div class="wbmi-image-result">
		<a :href="canonicalurl"
			target="_blank"
			:title="title">

			<img :src="thumbnail" :alt="displayName">
		</a>
	</div>
</template>

<script>
/**
 * @file ImageResult.vue
 *
 * Image-specific search result layout. Implements the general searchResult
 * mixin and includes some custom computed properties. aspectRatio is not
 * currently used but may be relevant in the future for layout.
 */
var searchResult = require( '../mixins/searchResult.js' );

// @vue/component
module.exports = {
	name: 'ImageResult',

	mixins: [ searchResult ],

	computed: {
		/**
		 * @return {number}
		 */
		width: function () {
			return this.imageinfo[ 0 ].width;
		},

		/**
		 * @return {number}
		 */
		height: function () {
			return this.imageinfo[ 0 ].height;
		},

		/**
		 * @return {number}
		 */
		aspectRatio: function () {
			return this.width / this.height;
		}
	}

};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

.wbmi-image-result {
	box-sizing: border-box;
	margin: @wbmi-spacing-sm;

	&:hover {
		.wbmi-result-box-shadow();
	}

	img {
		height: 180px;
		min-width: 100px;
		object-fit: cover;
		object-position: center center;
		width: 100%;
	}
}
</style>
