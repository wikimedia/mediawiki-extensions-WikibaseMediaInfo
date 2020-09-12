<template>
	<div class="wbmi-select" :class="rootClasses">
		<div
			class="wbmi-select__content"
			role="combobox"
			tabindex="0"
			aria-autocomplete="list"
			aria-haspopup="true"
			:aria-owns="listboxId"
			:aria-labelledby="textboxId"
			:aria-expanded="isExpanded"
			:aria-activedescendant="activeItemId"
			:aria-disabled="disabled"
			@click="onClick"
			@blur="toggleMenu( false )"
			@keyup.enter="onEnter"
			@keyup.up="onArrowUp"
			@keyup.down="onArrowDown"
		>
			<span
				:id="textboxId"
				class="wbmi-select__current-selection"
				role="textbox"
				aria-readonly="true"
			>
				{{ currentSelection }}
			</span>
			<wbmi-icon
				class="wbmi-select__handle"
				:icon="icons.wbmiIconExpand"
			>
			</wbmi-icon>
		</div>
		<wbmi-select-menu
			v-if="showMenu"
			:items="items"
			:active-item-index="activeItemIndex"
			:selected-item-index="selectedItemIndex"
			:listbox-id="listboxId"
			@select="onSelect"
			@active-item-change="onActiveItemChange"
		>
		</wbmi-select-menu>
	</div>
</template>

<script>
var Icon = require( './Icon.vue' ),
	SelectMenu = require( './SelectMenu.vue' ),
	icons = require( '../../../../lib/icons.js' );

/**
 * @file Select
 *
 * Select component with SelectMenu dropdown.
 *
 * This component takes a set of items as a prop (item data can take various
 * forms; see SelectMenu.vue for details) and passes those items to the
 * SelectMenu component for display. This component controls when the menu is
 * shown, shows the selected item if there is one, and emits the selected item
 * value to the parent.
 */
// @vue/component
module.exports = {
	name: 'WbmiSelect',

	components: {
		'wbmi-icon': Icon,
		'wbmi-select-menu': SelectMenu
	},

	props: {
		/**
		 * Name must be provided to ensure unique aria attributes. Should be a
		 * valid as a CSS id.
		 */
		name: {
			type: String,
			required: true
		},

		/**
		 * Displayed when no item is selected. If omitted, the first item will
		 * be selected and displayed initially (or the selected item is one is
		 * provided as a prop).
		 */
		label: {
			type: String,
			default: null
		},

		/** See SelectMenu.vue for allowed formats for items. */
		items: {
			type: [ Array, Object ],
			required: true
		},

		/**
		 * If an item should be selected on component mount, the selected item
		 * index can be included via this prop.
		 */
		initialSelectedItemIndex: {
			type: Number,
			default: -1
		},

		disabled: {
			type: Boolean
		}
	},

	data: function () {
		return {
			showMenu: false,
			icons: icons,
			activeItemIndex: -1,
			selectedItemIndex: this.initialSelectedItemIndex
		};
	},

	computed: {
		/**
		 * @return {string} The user-visible label for the current selection
		 */
		currentSelection: function () {
			if ( this.selectedItemIndex === -1 ) {
				return this.label;
			} else {
				return this.items[ this.selectedItemIndex ].label;
			}
		},

		/**
		 * @return {Object}
		 */
		rootClasses: function () {
			return {
				'wbmi-select--open': this.showMenu,
				'wbmi-select--disabled': this.disabled,
				// This class can be used by other components (e.g. Tabs) to
				// style component differently depending on whether or not a
				// value has been selected.
				'wbmi-select--value-selected': this.selectedItemIndex > -1
			};
		},

		/**
		 * For the aria-expanded attribute of the input, we need to use strings
		 * instead of booleans so that aria-expanded will be set to "false" when
		 * appropriate rather than the attribute being omitted, which is what
		 * would happen if we used a boolean false.
		 *
		 * @return {string}
		 */
		isExpanded: function () {
			return this.showMenu ? 'true' : 'false';
		},

		/**
		 * @return {string}
		 */
		textboxId: function () {
			return this.name + '__textbox';
		},

		/**
		 * @return {string}
		 */
		listboxId: function () {
			return this.name + '__listbox';
		},

		/**
		 * The ID of the element of the active menu item.
		 *
		 * @return {string|boolean}
		 */
		activeItemId: function () {
			return this.activeItemIndex > -1 ?
				this.listboxId + '-item-' + this.activeItemIndex :
				false;
		},

		/**
		 * @return {number} Number of items
		 */
		itemsLength: function () {
			if ( Array.isArray( this.items ) ) {
				return this.items.length;
			}

			if ( typeof this.items === 'object' ) {
				return Object.keys( this.items ).length;
			}

			return 0;
		}
	},

	methods: {
		/**
		 * Toggle menu state on click.
		 */
		onClick: function () {
			this.toggleMenu( !this.showMenu );
		},

		/**
		 * Handle enter keypress.
		 *
		 * @fires select
		 * @return {void}
		 */
		onEnter: function () {
			var value, keys;

			// If the menu is hidden, show it.
			if ( !this.showMenu ) {
				this.toggleMenu( true );
				return;
			}

			// If the menu is showing but there's no active item, close the menu.
			if ( this.activeItemIndex < 0 ) {
				this.toggleMenu( false );
				return;
			}

			// Otherwise:
			// - Show the selected item in the content box
			// - Store the selected item index so it can be styled as such if
			//   the menu is reopened
			// - Emit the selected item to the parent
			// - Hide the menu
			if (
				Array.isArray( this.items ) &&
				this.items.length &&
				typeof this.items[ 0 ] === 'string'
			) {
				// Handle array of strings.
				value = this.items[ this.activeItemIndex ];
			} else if (
				Array.isArray( this.items ) &&
				this.items.length &&
				typeof this.items[ 0 ] === 'object'
			) {
				// Handle array of objects.
				value = this.items[ this.activeItemIndex ].value;
			} else if ( typeof this.items === 'object' ) {
				// Handle object.
				keys = Object.keys( this.items );
				value = keys[ this.activeItemIndex ];
			}

			this.selectedItemIndex = this.activeItemIndex;
			this.$emit( 'select', value );
			this.toggleMenu( false );
		},

		/**
		 * Handle item click.
		 *
		 * @param {number} index
		 * @param {Object} item
		 * @param {string} item.label Selected item's human-readable label
		 * @param {string} item.value Selected item's value
		 * @fires submit
		 */
		onSelect: function ( index, item ) {
			this.activeItemIndex = index;
			this.selectedItemIndex = index;
			this.$emit( 'select', item.value );
			this.toggleMenu( false );
		},

		/**
		 * Move to the next item. If we're at the end, go back to the
		 * first item.
		 */
		onArrowDown: function () {
			var index = this.activeItemIndex;
			this.activeItemIndex = this.itemsLength > index + 1 ?
				index + 1 :
				0;
		},

		/**
		 * Move to the previous item. If we're at the beginning, go to
		 * the last item.
		 */
		onArrowUp: function () {
			var index = this.activeItemIndex;
			// Do nothing if there is no active item yet.
			if ( index > -1 ) {
				this.activeItemIndex = index === 0 ?
					this.itemsLength - 1 :
					index - 1;
			}
		},

		/**
		 * Change the active item index based on mouseover or mouseleave.
		 *
		 * @param {number} index
		 */
		onActiveItemChange: function ( index ) {
			this.activeItemIndex = index;
		},

		/**
		 * Set menu visibility.
		 *
		 * @param {boolean} show
		 * @return {void}
		 */
		toggleMenu: function ( show ) {
			if ( this.disabled ) {
				return;
			}

			this.showMenu = show;
		},

		/**
		 * Reset the component to initial values for selection index and
		 * user-visible label
		 */
		reset: function () {
			this.selectedItemIndex = this.initialSelectedItemIndex;
			this.activeItemIndex = -1;
		}
	}
};
</script>
