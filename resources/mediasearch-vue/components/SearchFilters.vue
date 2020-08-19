<template>
	<div v-if="hasFilters" class="wbmi-media-search-filters">
		<wbmi-select
			v-for="filter in searchFilters"
			:key="filter.type"
			:class="getFilterClasses( filter )"
			:name="filter.type"
			:items="filter.items"
			:initial-selected-item-index="getSelectedItemIndex( filter )"
			@select="onSelect( $event, filter.type )"
		>
		</wbmi-select>
	</div>
</template>

<script>
/**
 * @file SearchFilters.vue
 *
 * Container for the search filters for a tab. Displays the filters and handles
 * change in filter value. When a filter value changes, the Vuex state is
 * updated with the new filter value, and a new-search event is emitted so the
 * parent App component can dispatch the search action.
 */
var mapState = require( 'vuex' ).mapState,
	mapMutations = require( 'vuex' ).mapMutations,
	WbmiSelect = require( './base/Select.vue' ),
	SearchFilter = require( '../models/SearchFilter.js' ),
	filterItems = require( './../data/filterItems.json' );

// @vue/component
module.exports = {
	name: 'SearchFilters',

	components: {
		'wbmi-select': WbmiSelect
	},

	props: {
		mediaType: {
			type: String,
			required: true
		}
	},

	computed: $.extend( {}, mapState( [
		'filterValues'
	] ), {
		/**
		 * @return {Array} SearchFilter objects for this media type.
		 */
		searchFilters: function () {
			var filtersArray = [],
				filterKey,
				newFilter;

			for ( filterKey in filterItems[ this.mediaType ] ) {
				newFilter = new SearchFilter(
					filterKey,
					filterItems[ this.mediaType ][ filterKey ]
				);
				filtersArray.push( newFilter );
			}
			return filtersArray;
		},

		/**
		 * @return {boolean} Whether or not this media type has any filters
		 */
		hasFilters: function () {
			return this.searchFilters.length > 0;
		}
	} ),

	methods: $.extend( {}, mapMutations( [
		'addFilterValue',
		'removeFilterValue'
	] ), {
		/**
		 * Handle filter change.
		 *
		 * @param {string} value The new filter value
		 * @param {string} filterType
		 * @fires filter-change
		 */
		onSelect: function ( value, filterType ) {
			if ( value ) {
				this.addFilterValue( {
					value: value,
					mediaType: this.mediaType,
					filterType: filterType
				} );
			} else {
				this.removeFilterValue( {
					mediaType: this.mediaType,
					filterType: filterType
				} );
			}

			// Tell the App component to do a new search.
			this.$emit( 'filter-change' );
		},

		/**
		 * We need a class for select lists where a non-default item is selected.
		 *
		 * @param {SearchFilter} filter
		 * @return {Object}
		 */
		getFilterClasses: function ( filter ) {
			return {
				'wbmi-search-filter--selected': this.getSelectedItemIndex( filter ) > 0
			};
		},

		/**
		 * Get the index of the selected item for a filter.
		 *
		 * @param {Object} filter
		 * @return {number}
		 */
		getSelectedItemIndex: function ( filter ) {
			// Select the first option by default.
			var selectedItemIndex = 0,
				filterValue = filter.type in this.filterValues[ this.mediaType ] ?
					this.filterValues[ this.mediaType ][ filter.type ] : null;

			filter.items.forEach( function ( item, index ) {
				if ( item.value === filterValue ) {
					selectedItemIndex = index;
				}
			} );

			return selectedItemIndex;
		}
	} )
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

.wbmi-media-search-filters {
	.flex-display();
	background-color: @background-color-framed;
	padding: @wbmi-padding-vertical-base 0;

	.wbmi-select {
		// Styles for when a filter value has been selected.
		&.wbmi-search-filter--selected {
			.wbmi-select__content {
				color: @color-primary;
				font-weight: bold;

				.wbmi-select__handle {
					color: @color-primary;
				}
			}
		}

		&__content {
			background-color: transparent;
			border: 0;
			border-radius: 0;
			box-shadow: none;
			font-size: 0.9em;

			&:hover,
			&:focus {
				border-color: transparent;
				color: @color-primary--hover;
				outline: 0;

				.wbmi-select__handle {
					color: @color-primary--hover;
				}
			}
		}
	}
}
</style>
