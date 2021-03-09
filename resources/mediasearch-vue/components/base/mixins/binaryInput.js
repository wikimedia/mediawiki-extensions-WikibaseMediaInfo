/**
 * @file binaryInput.js
 *
 * Re-usable mixin for checkboxes and radios. Adapted from Buefy.
 */
module.exports = {
	props: {
		/**
		 * Value provided by v-model in a parent component.
		 *
		 * Rather than directly binding a value prop to this component, use
		 * v-model to bind a string, number, or boolean value (for a single
		 * input) or an array of values (for multiple inputs).
		 */
		value: {
			type: [ String, Number, Boolean, Array ],
			default: false
		},

		/**
		 * HTML value attribute to assign to the input.
		 *
		 * Required for multiple inputs.
		 */
		inputValue: {
			type: [ String, Number, Boolean ],
			default: false
		},

		disabled: {
			type: Boolean
		}
	},

	computed: {
		/**
		 * In the case of v-model use in a parent component, we need to
		 * duplicate the provided value to avoid mutating a prop, and manually
		 * emit an event when the value changes via this component.
		 */
		computedValue: {
			get: function () {
				return this.value;
			},
			set: function ( newValue ) {
				this.$emit( 'input', newValue );
			}
		}
	},

	methods: {
		/**
		 * Focus on the input.
		 *
		 * MacOS Firefox and Safari do not focus when label is clicked.
		 */
		onClick: function () {
			this.$refs.input.focus();
		}
	}
};
