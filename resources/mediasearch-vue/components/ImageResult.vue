<template>
	<a ref="link"
		class="wbmi-image-result"
		:href="canonicalurl"
		:title="title"
		:style="style"
		target="_blank"
		@click.prevent="showDetails">

		<wbmi-image
			:source="thumbnail"
			:alt="displayName">
		</wbmi-image>
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
var searchResult = require( '../mixins/searchResult.js' ),
	WbmiImage = require( './base/Image.vue' );

// @vue/component
module.exports = {
	name: 'ImageResult',

	components: {
		'wbmi-image': WbmiImage
	},

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
		thumbheight: function () {
			return this.imageinfo[ 0 ].thumbheight;
		},

		/**
		 * @return {number}
		 */
		thumbwidth: function () {
			return this.imageinfo[ 0 ].thumbwidth;
		},

		/**
		 * @return {number}
		 */
		aspectRatio: function () {
			return this.width / this.height;
		},

		/**
		 * @return {Object} style object with width and height properties
		 */
		style: function () {
			return {
				width: this.thumbwidth + 'px',
				height: this.thumbheight + 'px'
			};
		}
	}

};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

// Base element is an anchor tag for the sake of keyboard navigation.
.wbmi-image-result {
	background-color: @wmui-color-base80;
	box-sizing: border-box;
	display: block;
	height: 180px;
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
		height: 100%;
		object-fit: cover;
		object-position: center center;
		pointer-events: none;
		width: 100%;
	}
}
</style>
