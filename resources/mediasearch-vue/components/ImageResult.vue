<template>
	<div class="wbmi-image-result">
		<img v-bind:src="result.imageinfo[ 0 ].thumburl"
			v-bind:alt="result.title"
			class="wbmi-image-result__thumbnail"
			loading="lazy"
		>
	</div>
</template>

<script>
/**
 * Image result component.
 *
 * TODO: consider using description for alt text if it's available.
 */
// @vue/component
module.exports = {
	name: 'ImageResult',

	props: [ 'result' ]
};
</script>

<style lang="less">
@import 'mediawiki.mixins';

.wbmi-image-result {
	.flex( 1, 1, auto );
	height: 180px;
	padding: 8px;

	&__thumbnail {
		width: 100%;
		max-height: 100%;
		object-fit: cover;
	}
}

</style>
