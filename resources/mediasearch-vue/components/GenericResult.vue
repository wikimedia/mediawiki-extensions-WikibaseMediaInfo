<template>
	<div class="wbmi-generic-result">
		<h3>
			<a :href="canonicalurl" target="blank">
				{{ title }}
			</a>
		</h3>
	</div>
</template>

<script>
// @vue/component
module.exports = {
	name: 'GenericResult',

	props: {
		title: {
			type: String,
			required: true
		},

		canonicalurl: {
			type: String,
			required: true
		},

		pageid: {
			type: Number,
			required: true
		},

		index: {
			type: Number,
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

	h3 {
		padding-bottom: 0.5em;
	}
}
</style>
