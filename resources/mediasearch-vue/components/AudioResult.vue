<template>
	<div class="wbmi-audio-result">
		<h3 class="wbmi-audio-result__title">
			<a ref="link"
				:href="canonicalurl"
				target="_blank"
				:title="title"
				@click.prevent="showDetails">
				{{ displayName }}
			</a>
		</h3>

		<h4 v-if="formattedDuration && mime"
			class="wbmi-audio-result__meta">
			<span class="wbmi-audio-result__duration">{{ formattedDuration }}</span>
			<span class="wbmi-audio-result__mime">{{ mime }}</span>
		</h4>

		<p v-if="label">
			{{ label }}
		</p>
	</div>
</template>

<script>
/**
 * @file AudioResult.vue
 *
 * Audio-specific search result layout. Implements the general searchResult
 * mixin as well as the "time-based" result mixin.
 */
var searchResult = require( '../mixins/searchResult.js' ),
	searchResultTimeBased = require( '../mixins/searchResultTimeBased.js' );

// @vue/component
module.exports = {
	name: 'AudioResult',

	mixins: [
		searchResult,
		searchResultTimeBased
	]
};
</script>

<style lang="less">
@import '../../mediainfo-variables.less';

.wbmi-audio-result {
	box-sizing: border-box;
	padding: @wbmi-spacing-sm;

	&__title + &__meta {
		margin-top: 0;
		padding-top: 0;
	}

	&__duration {
		border-radius: @border-radius-base;
		color: @color-base--subtle;
		display: inline-block;
		background-color: @wmui-color-base80;
		font-weight: normal;
		padding: 0 @wbmi-spacing-xs;
		margin-right: @wbmi-spacing-sm;
	}

	&__mime {
		color: @color-base--subtle;
		font-weight: normal;
	}
}
</style>
