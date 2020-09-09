<template>
	<div class="wbmi-generic-result">
		<h3>
			<a :href="canonicalurl"
				target="_blank"
				:title="title">
				{{ displayName }}
			</a>
		</h3>
	</div>
</template>

<script>
/**
 * @file GenericResult.vue
 *
 * Fallback Result component. Does not implement the searchResult mixin; props
 * need to be directly specified here.
 */
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
	},

	computed: {
		/**
		 * Use mw.Title to get a normalized title without File, Category, etc. prepending
		 *
		 * @return {string}
		 */
		displayName: function () {
			return new mw.Title( this.title ).getMainText();
		}
	}
};
</script>
