<template>
	<button
		class="wbmi-button"
		:class="builtInClasses"
		:disabled="disabled"
		@click="$emit( 'click' )"
	>
		<wbmi-icon v-if="icon" :icon="icon"></wbmi-icon>
		<span class="wbmi-button__content">
			<slot></slot>
		</span>
	</button>
</template>

<script>
var WbmiIcon = require( './Icon.vue' );

/**
 * Button with optional icon.
 */
// @vue/component
module.exports = {
	name: 'WbmiButton',

	components: {
		'wbmi-icon': WbmiIcon
	},

	props: {
		disabled: {
			type: Boolean
		},

		frameless: {
			type: Boolean
		},

		// Icon path or object. See Icon.vue for valid icon formats.
		icon: {
			type: [ String, Object ],
			default: null
		},

		// Set to true to hide text node.
		invisibleText: {
			type: Boolean
		},

		// In OOUI, flags are passed in as an array (or a string or an object)
		// and are handled by a separate mixin. Passing them in individually is
		// a bit more readable and intuitive, plus it makes the code in this
		// component simpler.
		progressive: {
			type: Boolean
		},

		destructive: {
			type: Boolean
		},

		primary: {
			type: Boolean
		}
	},

	computed: {
		builtInClasses: function () {
			return {
				'wbmi-button--framed': !this.frameless,
				'wbmi-button--icon': this.icon,
				'wbmi-button--invisible-text': this.invisibleText,
				'wbmi-button--progressive': this.progressive,
				'wbmi-button--destructive': this.destructive,
				'wbmi-button--primary': this.primary
			};
		}
	}
};
</script>
