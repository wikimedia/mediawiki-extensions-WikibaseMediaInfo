<template>
	<div class="mw-indicator-component">
		<div class="mw-indicator-component__inner" @click="$emit('click')">
			<mw-icon
				:icon="icon"
				:invert="true"
				class="mw-indicator-component__icon"
			></mw-icon>
		</div>
	</div>
</template>

<script>
var Icon = require( './Icon.vue' );

// @vue/component
module.exports = {
	name: 'Indicator',

	components: {
		'mw-icon': Icon
	},

	props: {
		icon: {
			// To be passed down to the Icon component; accepts the same values
			type: String,
			default: null
		}
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';

/* stylelint-disable selector-class-pattern */
.mw-indicator-component {
	.flex-display();
	.flex-wrap( nowrap );
	align-items: center;
	box-sizing: border-box;
	flex-direction: column;
	justify-content: center;
	height: 100%;
	padding: 0 8px;

	&__inner {
		.flex-display();
		.flex-wrap( nowrap );
		align-items: center;
		background-color: rgba( 0, 0, 0, 0.67 );
		border-radius: 100%;
		box-sizing: border-box;
		flex-direction: column;
		height: 14px;
		justify-content: center;
		line-height: 1;
		text-align: center;
		width: 14px;
	}

	&__icon {
		cursor: pointer;
		width: 12px;
		height: 12px;
	}
}
</style>
