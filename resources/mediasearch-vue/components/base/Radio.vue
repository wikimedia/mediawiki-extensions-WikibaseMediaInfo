<template>
	<label
		ref="label"
		class="wbmi-radio"
		:aria-disabled="disabled"
		@click="onClick"
		@keydown.prevent.enter="$refs.label.click"
	>
		<input
			ref="input"
			v-model="computedValue"
			class="wbmi-radio__input"
			type="radio"
			:name="name"
			:value="inputValue"
			:aria-disabled="disabled"
			:disabled="disabled"
		>
		<span class="wbmi-radio__icon" :aria-disabled="disabled"></span>
		<span class="wbmi-radio__spacer"></span>
		<span class="wbmi-radio__label-text">
			<slot></slot>
		</span>
	</label>
</template>

<script>
var binaryInput = require( './mixins/binaryInput.js' );

/**
 * Radio input.
 */
// @vue/component
module.exports = {
	name: 'WbmiRadio',

	mixins: [ binaryInput ],

	props: {
		/**
		 * Name of the radio group.
		 */
		name: {
			type: String,
			default: ''
		}
	}
};
</script>
