<template>
	<div v-if="fileCount" class="wbmi-media-search-empty-state">
		<div class="wbmi-media-search-empty-state__icon">
		</div>

		<p v-i18n-html:wikibasemediainfo-special-mediasearch-empty-state="[ fileCount ]">
		</p>
	</div>
</template>

<script>
/**
 * @file EmptyState.vue
 *
 * A visual "empty state" containing a message that is displayed to the user
 * when no search term has been provided.
 */
var fileCount = mw.config.get( 'wbmiTotalSiteImages' );

// @vue/component
module.exports = {
	name: 'EmptyState',

	data: function () {
		return {
			fileCount: fileCount
		};
	}
};
</script>
