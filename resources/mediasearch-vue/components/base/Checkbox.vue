<template>
	<label
		ref="label"
		class="wbmi-checkbox"
		:aria-disabled="disabled"
		@click="onClick"
		@keydown.prevent.enter="$refs.label.click"
	>
		<input
			ref="input"
			v-model="computedValue"
			class="wbmi-checkbox__input"
			type="checkbox"
			:value="inputValue"
			:aria-disabled="disabled"
			:disabled="disabled"
		>
		<span class="wbmi-checkbox__icon" :aria-disabled="disabled"></span>
		<span class="wbmi-checkbox__spacer"></span>
		<span class="wbmi-checkbox__label-text">
			<slot></slot>
		</span>
	</label>
</template>

<script>
var binaryInput = require( './mixins/binaryInput.js' );

/**
 * Checkbox input.
 */
// @vue/component
module.exports = {
	name: 'WbmiCheckbox',

	mixins: [ binaryInput ]
};
</script>
