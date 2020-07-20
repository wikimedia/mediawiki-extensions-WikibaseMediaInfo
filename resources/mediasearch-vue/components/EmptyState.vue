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
var mapState = require( 'vuex' ).mapState;

// @vue/component
module.exports = {
	name: 'EmptyState',

	computed: $.extend( {}, mapState( [
		'fileCount'
	] ) )
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

.wbmi-media-search-empty-state {
	font-size: 1.2em; // match h3 font size
	margin: 0 auto;
	max-width: 17rem;
	padding: @wbmi-spacing-base;
	text-align: center;

	&__icon {
		background: center / contain no-repeat url( ../icons/empty_state.svg );
		height: 115px;
		margin: 0 auto;
		width: 150px;
	}

	&__file-count {
		font-weight: bold;
	}
}
</style>
