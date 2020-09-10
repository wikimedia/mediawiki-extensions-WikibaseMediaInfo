<template>
	<div v-if="hasFilters" class="wbmi-media-search-filters">
		<wbmi-select
			v-for="filter in searchFilters"
			ref="filters"
			:key="filter.type"
			:class="getFilterClasses( filter.type )"
			:name="filter.type"
			:items="filter.items"
			:initial-selected-item-index="0"
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
		},

		/**
		 * Key names (not values) of all active filters for the given tab;
		 * Having a shorthand computed property for this makes it easier to
		 * watch for changes.
		 *
		 * @return {Array} Empty array or [ "imageSize", "mimeType" ], etc
		 */
		currentActiveFilters: function () {
			return Object.keys( this.filterValues[ this.mediaType ] );
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
		 * @param {string} filterType
		 * @return {Object}
		 */
		getFilterClasses: function ( filterType ) {
			return {
				'wbmi-search-filter--selected': this.currentActiveFilters.indexOf( filterType ) !== -1
			};
		}
	} ),

	watch: {
		/**
		 * Watch for changes in active filters (regardless of value) so that we
		 * can re-set the Select components to initial values if filters are
		 * cleared via a Vuex action.
		 *
		 * @param {Array} newValue
		 * @param {Array} oldValue
		 */
		currentActiveFilters: function ( newValue, oldValue ) {
			// If we are going from one or more active filters to no filters,
			// then forcibly reset any filter components to their initial state
			// in case that change comes from a Vuex "clear" action rather than
			// the user clicking around.
			if ( oldValue.length > 0 && newValue.length === 0 ) {
				this.$refs.filters.forEach( function ( filter ) {
					filter.reset();
				} );
			}
		}
	}
};
</script>
