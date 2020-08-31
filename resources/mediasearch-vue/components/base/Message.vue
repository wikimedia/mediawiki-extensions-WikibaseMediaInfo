<template>
	<div
		class="wbmi-message"
		:class="builtInClasses"
		:aria-live="type !== 'error' ? 'polite' : false"
		:role="type === 'error' ? 'alert' : false "
	>
		<wbmi-icon :icon="icon"></wbmi-icon>
		<div class="wbmi-message__content">
			<slot></slot>
		</div>
	</div>
</template>

<script>
var WbmiIcon = require( './Icon.vue' ),
	icons = require( './../../../../lib/icons.js' ),
	ICON_MAP = {
		notice: icons.wbmiIconInfoFilled,
		error: icons.wbmiIconError,
		warning: icons.wbmiIconAlert,
		success: icons.wbmiIconCheck
	};

/**
 * User-facing message with icon.
 *
 * See CardStack for usage example.
 */
// @vue/component
module.exports = {
	name: 'WbmiMessage',

	components: {
		'wbmi-icon': WbmiIcon
	},

	props: {
		// Should be one of notice, warning, error, or success.
		type: {
			type: String,
			default: 'notice'
		},

		inline: {
			type: Boolean
		}
	},

	computed: {
		typeClass: function () {
			return 'wbmi-message--' + this.type;
		},

		builtInClasses: function () {
			var classes = { 'wbmi-message--block': !this.inline };
			classes[ this.typeClass ] = true;
			return classes;
		},

		icon: function () {
			return ICON_MAP[ this.type ];
		}
	}
};
</script>
