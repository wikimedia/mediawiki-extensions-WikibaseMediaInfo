<template>
	<div class="wbmi-select-menu">
		<ul
			:id="listboxId"
			class="wbmi-select-menu__list"
			role="listbox"
			:aria-labelledby="labelledBy"
		>
			<li
				v-for="( item, index ) in formattedItems"
				:id="listboxId + '-item-' + index"
				:key="listboxId + '-item-' + index"
				class="wbmi-select-menu__list-item"
				:class="getItemClasses( index )"
				role="option"
				:aria-selected="isActiveItem( index )"
				@mousedown="onMousedown( index, item )"
				@mouseover="$emit( 'active-item-change', index )"
				@mouseleave="$emit( 'active-item-change', -1 )"
			>
				{{ item.label }}
			</li>
		</ul>
	</div>
</template>

<script>
/**
 * @file SelectMenu
 *
 * List of items that informs the parent component when an item is clicked.
 * Receives the index of the active item from parent so a visual indication can
 * be applied via CSS here.
 *
 * On hover, active item index is emitted to the parent. On mouse leave, the
 * index is reset to -1 (i.e. no active item).
 */
// @vue/component
module.exports = {
	name: 'SelectMenu',

	props: {
		/**
		 * Items can come in 3 formats:
		 * 1. An array of strings
		 *    Example: ['Apple', 'Banana', 'Orange']
		 * 2. An array of objects with label and value keys
		 *    Example: [{label: 'Apple', value: 'a'}, {label: 'Banana', value: 'b'}]
		 * 3. An object of simple key:string pairs
		 *    Example: {a: 'Apple', b: 'Banana', c: 'Carrot'}
		 */
		items: {
			type: [ Array, Object ],
			default: function () {
				return [];
			}
		},

		/**
		 * Index of the item the user is (figuratively) focused on.
		 */
		activeItemIndex: {
			type: Number,
			default: 0
		},

		/**
		 * Index of the currently selected item. This prop will only exist for
		 * parent components like a select list, since the item list persists.
		 */
		selectedItemIndex: {
			type: Number,
			default: -1
		},

		listboxId: {
			type: String,
			required: true
		},

		labelledBy: {
			type: String,
			default: null
		}
	},

	computed: {
		/**
		 * @return {Array} Array of objects with label and value keys
		 */
		formattedItems: function () {
			return this.getFormattedItems( this.items );
		}
	},

	methods: {
		/**
		 * Handle mousedown.
		 *
		 * @param {number} index
		 * @param {Object} item
		 * @fires select
		 */
		onMousedown: function ( index, item ) {
			// If this is the selected item, do nothing.
			if ( index === this.selectedItemIndex ) {
				return;
			}

			this.$emit( 'select', index, item );
		},

		/**
		 * Determine if a list item should have the active class.
		 *
		 * @param {number} index
		 * @return {boolean}
		 */
		isActiveItem: function ( index ) {
			return index === this.activeItemIndex;
		},

		/**
		 * Determine if a list item should have the selected class.
		 *
		 * @param {number} index
		 * @return {boolean}
		 */
		isSelectedItem: function ( index ) {
			return index === this.selectedItemIndex;
		},

		getItemClasses: function ( index ) {
			return {
				'wbmi-select-menu__list-item--active': this.isActiveItem( index ),
				'wbmi-select-menu__list-item--selected': this.isSelectedItem( index )
			};
		},

		/**
		 * Format items prop.
		 *
		 * Items can be provided in a variety of formats. We need to process
		 * them into a single format to be used in the template.
		 *
		 * @param {Array|Object} items
		 * @return {Array} Array of objects with label and value keys
		 */
		getFormattedItems: function ( items ) {
			var keys;

			// Handle array of strings.
			if (
				Array.isArray( items ) &&
				items.length &&
				typeof items[ 0 ] === 'string'
			) {
				return items.map( function ( item ) {
					return {
						label: item,
						value: item
					};
				} );
			}

			// Handle array of objects.
			if (
				Array.isArray( items ) &&
				items.length &&
				typeof items[ 0 ] === 'object'
			) {
				return items.map( function ( item ) {
					if ( 'label' in item && 'value' in item ) {
						return item;
					}

					return false;
				} );
			}

			// Handle object.
			if ( typeof items === 'object' ) {
				keys = Object.keys( items );
				return keys.map( function ( key ) {
					return {
						label: items[ key ],
						value: key
					};
				} );
			}

			throw new Error( 'Passed value format is not supported' );
		}
	}
};
</script>
