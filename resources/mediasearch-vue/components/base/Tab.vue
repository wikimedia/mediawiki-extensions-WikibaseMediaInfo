<template>
	<transition name="mw-tab-fade-in">
		<div
			v-show="isActive"
			v-bind:id="id"
			v-bind:aria-hidden="!isActive"
			v-bind:aria-labeledby="id + '-label'"
			class="mw-tab"
			role="tabpanel"
		>
			<slot />
		</div>
	</transition>
</template>

<script>
/**
 * A single tab, to be used inside a Tabs component. See App for usage example.
 */
// @vue/component
module.exports = {
	name: 'Tab',
	props: {
		name: {
			type: String,
			required: true
		},

		title: {
			type: String,
			required: true
		},

		disabled: {
			type: Boolean
		}
	},

	data: function () {
		return {
			isActive: false
		};
	},

	computed: {
		id: function () {
			return 'mw-tab-' + this.name;
		}
	}
};
</script>

<style lang="less">
// Transitions.
.mw-tab-fade-in-enter {
	opacity: 0;
}

.mw-tab-fade-in-enter-active {
	transition: opacity 0.25s;
}
</style>
