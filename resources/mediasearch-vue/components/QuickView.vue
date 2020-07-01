<template>
	<div class="wbmi-media-search-quick-view">
		<header class="wbmi-media-search-quick-view__header">
			<img :src="thumbnail" class="wbmi-media-search-quick-view__thumbnail">

			<button class="wbmi-media-search-quick-view__close-button" @click="close">
				X
			</button>
		</header>

		<div class="wbmi-media-search-quick-view__body">
			<h3>
				<a :href="canonicalurl">
					{{ title }}
				</a>
			</h3>
			<!-- eslint-disable-next-line vue/no-v-html -->
			<p v-html="metadata.ImageDescription.value"></p>
		</div>
	</div>
</template>

<script>
/**
 * @file QuickView.vue
 *
 * Component to display expanded details about a given search result
 */
// @vue/component
module.exports = {
	name: 'QuickView',

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

		imageinfo: {
			type: Array,
			required: false,
			default: function () {
				return [ {} ];
			}
		}
	},

	computed: {
		/**
		 * @return {string|undefined}
		 */
		thumbnail: function () {
			return this.imageinfo[ 0 ].thumburl;
		},

		/**
		 * @return {Object|undefined}
		 */
		metadata: function () {
			return this.imageinfo[ 0 ].extmetadata;
		}
	},

	methods: {
		close: function () {
			this.$emit( 'close' );
		},

		/**
		 * Use this method if a non-HTML metadata value is required.
		 *
		 * @param {string} raw HTML string
		 * @return {string}
		 */
		stripHTML: function ( raw ) {
			return $( '<p>' ).append( raw ).text();
		}
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../../lib/wikimedia-ui-base.less';

.wbmi-media-search-quick-view {
	border: @border-base;
	border-radius: 4px;
	box-sizing: @box-shadow-card;
	position: sticky;
	margin-top: 8px;
	top: 8px;

	&__thumbnail {
		background-color: @wmui-color-base70;
		object-fit: contain;
		height: auto;
		max-height: 300px;
		width: 100%;
	}

	&__close-button {
		position: absolute;
		top: 8px;
		left: 8px;
	}

	&__body {
		padding: 16px;
	}
}
</style>
