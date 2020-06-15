<template>
	<div class="wbmi-mediasearch-image-result">
		<img v-bind:src="result.imageinfo[ 0 ].thumburl" 
			v-bind:alt="result.title"
			class="wbmi-mediasearch-image-result__thumbnail"
			loading="lazy"
		>
	</div>
</template>

<script>
// @vue/component
module.exports = {
	name: 'ImageResult',

	props: [ 'result' ]
};
</script>

<style lang="less">

.wbmi-mediasearch-image-result {
	height: 180px;
	flex: 1 1 auto;
	padding: 0.5rem;

	&__thumbnail {
		width: 100%;
		max-height: 100%;
		object-fit: cover;
	}
}

</style>
