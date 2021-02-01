<template>
	<div class="wbmi-page-result">
		<h3>
			<a :href="canonicalurl"
				target="_blank"
				:title="title"
				@click="$emit('click')">
				{{ displayName }}
			</a>
		</h3>

		<p v-if="hasCategoryText"
			v-i18n-html:wikibasemediainfo-special-mediasearch-category-info="[
				formatNumber( categoryinfo.size ),
				formatNumber( categoryinfo.subcats ),
				formatNumber( categoryinfo.files )
			]">
		</p>

		<template v-else>
			<p v-if="size">
				{{ formatSize( size ) }}
			</p>

			<p v-if="wordcount"
				v-i18n-html:wikibasemediainfo-special-mediasearch-wordcount="[
					formatNumber( wordcount )
				]">
			</p>
		</template>
	</div>
</template>

<script>
/**
 * @file PageResult.vue
 *
 * Represents page and category results.
 */
var searchResult = require( '../../mixins/searchResult.js' );

// @vue/component
module.exports = {
	name: 'PageResult',

	mixins: [ searchResult ],

	inheritAttrs: false,

	props: {
		categoryinfo: {
			type: Object,
			default: function () {
				return {};
			}
		},

		size: {
			type: Number,
			default: null
		},

		wordcount: {
			type: Number,
			default: null
		}
	},

	computed: {
		/**
		 * @return {boolean}
		 */
		hasCategoryText: function () {
			return Object.keys( this.categoryinfo ).length > 0;
		}
	}
};
</script>
