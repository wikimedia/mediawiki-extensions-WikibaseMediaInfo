<template>
	<div class="wbmi-page-result">
		<h3>
			<a :href="canonicalurl"
				target="_blank"
				:title="title">
				{{ displayName }}
			</a>
		</h3>
		<p v-if="hasCategoryText"
			v-i18n-html:wikibasemediainfo-special-mediasearch-category-info="[
				categoryinfo.size,
				categoryinfo.subcats,
				categoryinfo.files
			]"></p>
	</div>
</template>

<script>
/**
 * @file PageResult.vue
 *
 * Represents page and category results. Does not implement the searchResult
 * mixin; props need to be directly specified here.
 */
// @vue/component
module.exports = {
	name: 'PageResult',

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
		},

		categoryinfo: {
			type: Object,
			default: function () {
				return {};
			}
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
		},

		/**
		 * @return {boolean}
		 */
		hasCategoryText: function () {
			return Object.keys( this.categoryinfo ).length > 0;
		}
	}
};
</script>
