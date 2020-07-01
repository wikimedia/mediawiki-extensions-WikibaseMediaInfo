<template>
	<div class="wbmi-generic-result">
		<h6>
			<a :href="result.canonicalurl">
				{{ result.title }}
			</a>
		</h6>
	</div>
</template>

<script>
// @vue/component
module.exports = {
	name: 'GenericResult',

	props: {
		result: {
			type: Object,
			required: true
		}
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../../lib/wikimedia-ui-base.less';

.wbmi-generic-result {
	padding: 8px;

	&:nth-of-type( odd ) {
		background-color: #f6f8fc;
	}
}
</style>
