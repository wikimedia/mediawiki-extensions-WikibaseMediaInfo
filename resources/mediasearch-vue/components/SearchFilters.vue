<template>
	<div class="wbmi-media-search-filters">
		<wbmi-select
			v-for="filter in searchFilters"
			ref="filters"
			:key="filter.type"
			:class="getFilterClasses( filter.type )"
			:name="filter.type"
			:items="filter.items"
			:initial-selected-item-index="0"
			:prefix="getFilterPrefix( filter.type )"
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
	filterItems = require( './../data/filterItems.json' ),
	sortFilterItems = require( './../data/sortFilterItems.json' );

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
				newFilter,
				sortFilter = new SearchFilter( 'sort', sortFilterItems );

			for ( filterKey in filterItems[ this.mediaType ] ) {
				newFilter = new SearchFilter(
					filterKey,
					filterItems[ this.mediaType ][ filterKey ]
				);
				filtersArray.push( newFilter );
			}

			// All media types use the sort filter.
			filtersArray.push( sortFilter );
			return filtersArray;
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
		},

		/**
		 * Add select list prefixes per filter type.
		 *
		 * @param {string} filterType
		 * @return {string}
		 */
		getFilterPrefix: function ( filterType ) {
			if ( filterType === 'sort' ) {
				return this.$i18n( 'wikibasemediainfo-special-mediasearch-filter-sort-label' );
			}

			return '';
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
