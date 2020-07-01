<template>
	<div class="wbmi-image-result" @click="showDetails">
		<img :src="thumbnail" :alt="title">
	</div>
</template>

<script>
var searchResult = require( '../mixins/searchResult.js' );

module.exports = {
	name: 'ImageResult',

	mixins: [ searchResult ],

	computed: {
		width: function () {
			return this.imageinfo[ 0 ].width;
		},

		height: function () {
			return this.imageinfo[ 0 ].height;
		},

		aspectRatio: function () {
			return this.width / this.height;
		}
	}

};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../../lib/wikimedia-ui-base.less';

.wbmi-image-result {
	box-sizing: border-box;
	cursor: pointer;
	margin: 8px;

	&:hover {
		.box-shadow( 4px 4px 5px -2px @border-color-base );
	}

	img {
		height: 180px;
		min-width: 100px;
		object-fit: cover;
		object-position: center center;
		width: 100%;
	}

	&__title {
		height: 20px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}
</style>
