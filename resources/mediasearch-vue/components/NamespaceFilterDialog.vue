<template>
	<wbmi-dialog
		class="wbmi-media-search-namespace-dialog"
		:active="active"
		:title="dialogTitle"
		:progressive-action="dialogAction"
		:progressive-action-disabled="disableDialogAction"
		@progress="onProgress"
		@close="cancel"
	>
		<div>
			<div class="wbmi-media-search-namespace-dialog__radios">
				<wbmi-radio
					v-for="item in items"
					:key="item.value"
					v-model="selectedRadio"
					name="namespaces"
					:input-value="item.value"
				>
					{{ item.label }}
				</wbmi-radio>
			</div>

			<div class="wbmi-media-search-namespace-dialog__custom">
				<wbmi-checkbox
					v-for="namespace in formattedNamespaces"
					:key="namespace.value"
					v-model="selectedCustom"
					:input-value="namespace.value"
					:disabled="!isCustom"
				>
					{{ namespace.label }}
				</wbmi-checkbox>
			</div>
		</div>
	</wbmi-dialog>
</template>

<script>
var WbmiDialog = require( './base/Dialog.vue' ),
	WbmiRadio = require( './base/Radio.vue' ),
	WbmiCheckbox = require( './base/Checkbox.vue' );

/**
 * @file NamespaceFilterDialog.vue
 *
 * This component consists of a dialog that contains namespace filter options.
 * Data—both the filter keyword and a custom list of selected namespaces—is
 * handled via v-model and emitted up to the SearchFilters component.
 */
// @vue/component
module.exports = {
	name: 'NamespaceFilterDialog',

	components: {
		'wbmi-dialog': WbmiDialog,
		'wbmi-radio': WbmiRadio,
		'wbmi-checkbox': WbmiCheckbox
	},

	props: {
		/**
		 * Options for the filter.
		 */
		items: {
			type: Array,
			required: true
		},

		/**
		 * A list of all namespaces keyed on their namespace ID.
		 */
		namespaces: {
			type: Object,
			required: true
		},

		/**
		 * A list of all supported namespace groups as well as the namespace
		 * IDs they contain
		 */
		namespaceGroups: {
			type: Object,
			required: true
		},

		/**
		 * Whether or not the dialog should appear.
		 */
		active: {
			type: Boolean
		},

		/**
		 * Initial value of the filter (defaults to 'all' in the parent).
		 */
		initialValue: {
			type: String,
			required: true
		}
	},

	data: function () {
		return {
			selectedRadio: this.initialRadio,
			selectedCustom: this.initialCustom,
			dialogTitle: this.$i18n( 'wikibasemediainfo-special-mediasearch-filter-namespace-dialog-title' ),
			dialogAction: this.$i18n( 'wikibasemediainfo-special-mediasearch-filter-namespace-dialog-progressive-action' )
		};
	},

	computed: {
		/**
		 * The initially selected namespace keyword.
		 *
		 * @return {string}
		 */
		initialRadio: function () {
			return this.initialValue in this.namespaceGroups ?
				this.initialValue : 'custom';
		},

		/**
		 * The initially selected custom namespace(s).
		 *
		 * @return {Array}
		 */
		initialCustom: function () {
			return this.initialValue in this.namespaceGroups ?
				[ '0' ] : this.initialValue.split( '|' );
		},

		/**
		 * An array of objects with namespace data for display, including a
		 * label (human-readable namespace prefix) and a value (namespace id).
		 *
		 * @return {Array}
		 */
		formattedNamespaces: function () {
			return Object.keys( this.namespaces ).map( function ( id ) {
				return {
					label: id === '0' ?
						// Main namespace, Gallery, without the parentheses
						mw.msg( 'blanknamespace' ).replace( /^[(]?/, '' ).replace( /[)]?$/, '' ) :
						// Namespace prefix, with space instead of underscore
						this.namespaces[ id ].replace( /_/g, ' ' ),
					value: id
				};
			}, this );
		},

		/**
		 * Whether the custom radio is selected.
		 *
		 * @return {boolean}
		 */
		isCustom: function () {
			return this.selectedRadio === 'custom';
		},

		/**
		 * If "custom" is selected with no checkboxes, disable Submit button.
		 *
		 * @return {boolean}
		 */
		disableDialogAction: function () {
			return this.isCustom && this.selectedCustom.length === 0;
		}
	},

	methods: {
		/**
		 * When the user closes the dialog without submitting.
		 */
		cancel: function () {
			// Close the dialog.
			this.$emit( 'close' );

			// Reset to the last submitted values (or default).
			this.selectedRadio = this.initialRadio;
			this.selectedCustom = this.initialCustom;
		},

		/**
		 * Submit the namespace group to be stored in state, or, if a custom
		 * list of namespaces is selected, submit a pipe-separated list of
		 * namespace IDs.
		 */
		onProgress: function () {
			var value = this.isCustom ? this.selectedCustom.join( '|' ) : this.selectedRadio;

			this.$emit( 'submit', value );
			this.$emit( 'close' );
		},

		/**
		 * Select a value (and custom namespaces, if provided).
		 *
		 * @param {string} selection
		 */
		select: function ( selection ) {
			if ( this.namespaceGroups[ selection ] ) {
				// selection matches one of the pre-defined namespace groups
				this.selectedRadio = selection;
				this.selectedCustom = this.initialCustom;
			} else {
				// selection is a string of arbitrary namespace IDs and
				// needs to be parsed
				this.selectedRadio = this.activeRadio = 'custom';
				this.selectedCustom = this.activeCustom = selection.split( '|' );
			}
		},

		/**
		 * Reset to the default values.
		 */
		reset: function () {
			this.selectedRadio = this.initialRadio;
			this.selectedCustom = this.initialCustom;
		}
	}
};
</script>
