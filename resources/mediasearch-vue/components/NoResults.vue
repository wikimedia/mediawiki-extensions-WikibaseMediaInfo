<template>
	<div class="wbmi-media-search-no-results">
		<div class="wbmi-media-search-no-results__icon">
		</div>

		<p>
			{{ $i18n( 'wikibasemediainfo-special-mediasearch-no-results' ) }}
			<span class="wbmi-media-search-no-results__tips">
				{{ $i18n( 'wikibasemediainfo-special-mediasearch-no-results-tips' ) }}
			</span>
		</p>
	</div>
</template>

<script>
/**
 * @file NoResults.vue
 *
 * A visual "no results" message
 */

// @vue/component
module.exports = {
	name: 'NoResults'
};
</script>
