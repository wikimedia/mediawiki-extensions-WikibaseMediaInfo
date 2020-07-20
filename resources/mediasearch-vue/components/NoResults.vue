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

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

.wbmi-media-search-no-results {
	font-size: 1.2em; // match h3 font size
	font-weight: bold;
	margin: 0 auto;
	max-width: 30rem;
	padding: @wbmi-spacing-base;
	text-align: center;

	&__icon {
		background: center / contain no-repeat url( ../icons/no_results.svg );
		height: 115px;
		margin: 0 auto;
		width: 150px;
	}

	&__tips {
		display: block;
		font-weight: normal;
	}
}
</style>
