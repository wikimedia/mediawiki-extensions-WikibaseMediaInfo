<template>
	<div class="wbmi-media-search-end-of-results">
		<p>
			{{ $i18n( 'wikibasemediainfo-special-mediasearch-end-of-results' ) }}
			<span class="wbmi-media-search-no-results__tips">
				{{ $i18n( 'wikibasemediainfo-special-mediasearch-end-of-results-tips' ) }}
			</span>
		</p>
	</div>
</template>

<script>
/**
 * @file EndOfResults.vue
 *
 * A visual "end of results" message
 */

// @vue/component
module.exports = {
	name: 'EndOfResults'
};
</script>
