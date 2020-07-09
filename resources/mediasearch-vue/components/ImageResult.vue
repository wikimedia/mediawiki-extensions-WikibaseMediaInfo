<template>
	<a ref="link"
		class="wbmi-image-result"
		:href="canonicalurl"
		target="_blank"
		:title="title"
		@click.prevent="showDetails">

		<img :src="thumbnail" :alt="displayName">
	</a>
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

// Base element is an anchor tag for the sake of keyboard navigation.
.wbmi-image-result {
	box-sizing: border-box;
	display: block;
	margin: @wbmi-spacing-sm;
	transition: box-shadow @transition-base ease, outline @transition-base ease;

	&:hover,
	&:focus {
		.wbmi-result-box-shadow();
	}

	// Extra prominence on focus using outline, for users navigating via keyboard
	&:focus {
		outline: solid 2px @color-primary;
		outline-offset: -2px;
	}

	img {
		height: 180px;
		min-width: 100px;
		object-fit: cover;
		object-position: center center;
		pointer-events: none;
		width: 100%;
	}
}
</style>
