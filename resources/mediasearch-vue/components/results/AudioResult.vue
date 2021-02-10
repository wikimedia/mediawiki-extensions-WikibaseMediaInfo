<template>
	<div class="wbmi-audio-result">
		<h3 class="wbmi-audio-result__title">
			<a ref="link"
				:href="canonicalurl"
				target="_blank"
				:title="title"
				@click="showDetails">
				{{ displayName }}
			</a>
		</h3>

		<h4 class="wbmi-audio-result__meta">
			<span class="wbmi-audio-result__duration">
				<wbmi-icon :icon="icon"></wbmi-icon>
				<span v-if="formattedDuration" class="wbmi-audio-result__duration__text">{{ formattedDuration }}</span>
			</span>
			<span v-if="mime" class="wbmi-audio-result__mime">{{ mime }}</span>
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
var searchResult = require( '../../mixins/searchResult.js' ),
	searchResultTimeBased = require( '../../mixins/searchResultTimeBased.js' ),
	WbmiIcon = require( '../base/Icon.vue' ),
	icons = require( '../../../../lib/icons.js' );

// @vue/component
module.exports = {
	name: 'AudioResult',

	components: {
		'wbmi-icon': WbmiIcon
	},

	mixins: [
		searchResult,
		searchResultTimeBased
	],

	inheritAttrs: false,

	data: function () {
		return {
			icon: icons.wbmiIconVolumeUp
		};
	}
};
</script>
