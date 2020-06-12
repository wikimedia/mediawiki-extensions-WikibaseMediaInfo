<template>
	<span
		class="mw-icon"
		v-bind:class="builtInClasses"
	>
		{{ label }}
	</span>
</template>

<script>
/**
 * Icon with an optional visually-hidden label.
 *
 * See Button, Message, and Suggestion for usage examples.
 */
// @vue/component
module.exports = {
	name: 'Icon',
	props: {
		icon: {
			type: String,
			default: null
		},
		// Whether or not to invert the icon color.
		invert: {
			type: Boolean
		},
		label: {
			// String or message object.
			type: [ String, Object ],
			default: null
		}
	},

	computed: {
		iconClass: function () {
			return 'oo-ui-icon-' + this.icon;
		},
		builtInClasses: function () {
			// Use the existing OOUI classes for icon images for now.
			var classes = { 'oo-ui-image-invert': this.invert };
			classes[ this.iconClass ] = true;
			return classes;
		}
	}
};
</script>

<style lang="less">
.mw-icon {
	background-size: contain;
	background-position: center center;
	background-repeat: no-repeat;
	display: inline-block;
	height: 20/14em;
	line-height: 2.5;
	margin: 0;
	overflow: hidden;
	padding: 0;
	position: static;
	text-indent: -9999px;
	vertical-align: middle;
	width: 20/14em;
	user-select: none;
}
</style>
