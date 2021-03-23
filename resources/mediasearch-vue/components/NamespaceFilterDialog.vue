<template>
	<wbmi-dialog
		class="wbmi-media-search-namespace-dialog"
		:active="active"
		:title="dialogTitle"
		:progressive-action="dialogAction"
		:progressive-action-disabled="disableDialogAction"
		@progress="onProgress"
		@close="close"
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
	WbmiCheckbox = require( './base/Checkbox.vue' ),
	radioDefault = 'all',
	checkboxDefault = [ '0' ];

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
		}
	},

	data: function () {
		return {
			selectedRadio: radioDefault,
			selectedCustom: checkboxDefault,
			dialogTitle: this.$i18n( 'wikibasemediainfo-special-mediasearch-filter-namespace-dialog-title' ),
			dialogAction: this.$i18n( 'wikibasemediainfo-special-mediasearch-filter-namespace-dialog-progressive-action' )
		};
	},

	computed: {
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
		close: function () {
			this.$emit( 'close' );
		},

		onProgress: function () {
			this.$emit( 'submit', {
				value: this.selectedRadio,
				custom: this.isCustom ? this.selectedCustom : null
			} );

			this.close();
		},

		/**
		 * Select a value (and custom namespaces, if provided).
		 *
		 * @param {Object|string} selection
		 */
		select: function ( selection ) {
			if ( typeof selection === 'object' ) {
				// Selection is an object (provided from JS UI)
				this.selectedRadio = selection.value;
				this.selectedCustom = selection.custom || checkboxDefault;
			} else if ( typeof selection === 'string' ) {
				// selection is a string (provided from PHP UI);
				if ( this.namespaceGroups[ selection ] ) {
					// selection matches one of the pre-defined namespace groups
					this.selectedRadio = selection;
					this.selectedCustom = checkboxDefault;
				} else {
					// selection is a string of arbitrary namespace IDs and
					// needs to be parsed
					this.selectedRadio = 'custom';
					this.selectedCustom = selection.split( '|' );
				}
			}
		},

		/**
		 * Reset to the default values.
		 */
		reset: function () {
			this.selectedRadio = radioDefault;
			this.selectedCustom = checkboxDefault;
		}
	}
};
</script>
