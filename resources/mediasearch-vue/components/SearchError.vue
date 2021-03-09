<template>
	<div class="wbmi-media-search-error">
		<div class="wbmi-media-search-error__icon"></div>

		<p>
			{{ $i18n( 'wikibasemediainfo-special-mediasearch-error-message' ) }}
			<span class="wbmi-media-search-error__message">
				{{ $i18n( 'wikibasemediainfo-special-mediasearch-error-text' ) }}
			</span>
		</p>
	</div>
</template>

<script>
/**
 * @file SearchError.vue
 *
 * A visual "invalid search" message
 */

// @vue/component
module.exports = {
	name: 'SearchError'
};
</script>
