<template>
	<div class="wbmi-media-search-filters-wrapper" :class="rootClasses">
		<div class="wbmi-media-search-filters">
			<template v-for="( filter, index ) in searchFilters">
				<wbmi-select
					:ref="filter.type"
					:key="'filter-' + index"
					:class="getFilterClasses( filter.type )"
					:name="filter.type"
					:items="filter.items"
					:initial-selected-item-index="0"
					:prefix="getFilterPrefix( filter.type )"
					@select="onSelect( $event, filter.type )"
				>
				</wbmi-select>
				<wbmi-observer
					v-if="index === searchFilters.length - 1 && supportsObserver"
					:key="'filter-observer-' + index"
					@intersect="removeGradientClass"
					@hide="addGradientClass"
				></wbmi-observer>
			</template>
			<span v-if="showResultsCount" class="wbmi-media-search-results-count">
				{{ resultsCount }}
			</span>
		</div>
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
	WbmiObserver = require( './base/Observer.vue' ),
	SearchFilter = require( '../models/SearchFilter.js' ),
	searchOptions = require( './../data/searchOptions.json' );

// @vue/component
module.exports = {
	name: 'SearchFilters',

	components: {
		'wbmi-select': WbmiSelect,
		'wbmi-observer': WbmiObserver
	},

	props: {
		mediaType: {
			type: String,
			required: true
		}
	},

	data: function () {
		return {
			hasGradient: false
		};
	},

	computed: $.extend( {}, mapState( [
		'totalHits',
		'filterValues'
	] ), {
		/**
		 * @return {Object}
		 */
		rootClasses: function () {
			return {
				'wbmi-media-search-filters-wrapper--gradient': this.hasGradient
			};
		},

		/**
		 * @return {Array} SearchFilter objects for this media type.
		 */
		searchFilters: function () {
			var optionsForType = searchOptions[ this.mediaType ],
				filters = [];

			Object.keys( optionsForType ).forEach( function ( option ) {
				var filter = new SearchFilter( option, optionsForType[ option ] );
				filters.push( filter );
			} );

			return filters;
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
		},

		supportsObserver: function () {
			return 'IntersectionObserver' in window &&
				'IntersectionObserverEntry' in window &&
				'intersectionRatio' in window.IntersectionObserverEntry.prototype;
		},

		/**
		 * Number of results should only display if results exist.
		 *
		 * @return {boolean} Whether to display the results count
		 */
		showResultsCount: function () {
			return this.totalHits[ this.mediaType ] > 0;
		},

		/**
		 * String representing the number of search results.
		 *
		 * @return {Object} Message object
		 */
		resultsCount: function () {
			return this.$i18n(
				'wikibasemediainfo-special-mediasearch-results-count',
				this.totalHits[ this.mediaType ].toLocaleString( mw.config.get( 'wgUserLanguage' ) )
			);
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
			var oldValue = this.filterValues[ this.mediaType ][ filterType ] || '';

			if ( value ) {
				this.addFilterValue( {
					mediaType: this.mediaType,
					filterType: filterType,
					value: value
				} );
				/* eslint-disable camelcase */
				this.$log( {
					action: 'filter_change',
					search_media_type: this.mediaType,
					search_filter_type: filterType,
					search_filter_value: value,
					prior_search_filter_type: filterType,
					prior_search_filter_value: oldValue
				} );
				/* eslint-enable camelcase */
			} else {
				this.removeFilterValue( {
					mediaType: this.mediaType,
					filterType: filterType
				} );

				/* eslint-disable camelcase */
				this.$log( {
					action: 'filter_change',
					search_media_type: this.mediaType,
					search_filter_type: filterType,
					search_filter_value: '',
					prior_search_filter_type: filterType,
					prior_search_filter_value: oldValue
				} );
				/* eslint-enable camelcase */
			}

			// Tell the App component to do a new search and update the URL
			// params
			this.$emit( 'filter-change', {
				mediaType: this.mediaType,
				filterType: filterType,
				value: value
			} );
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
		},

		/**
		 * When final filter is out of view, add class that will add a gradient
		 * to indicate to the user that they can horizontally scroll.
		 */
		addGradientClass: function () {
			this.hasGradient = true;
		},

		/**
		 * When final filter is in view, don't show the gradient.
		 */
		removeGradientClass: function () {
			this.hasGradient = false;
		},

		resetAllFilters: function () {
			this.searchFilters.forEach( function ( filter ) {
				this.$refs[ filter.type ][ 0 ].reset();
			}.bind( this ) );
		},

		/**
		 * Set each filter component's state to match the appropriate
		 * value in Vuex
		 */
		synchronizeFilters: function () {
			this.searchFilters.forEach( function ( filter ) {
				var currentValue = this.filterValues[ this.mediaType ][ filter.type ];

				if ( currentValue ) {
					this.$refs[ filter.type ][ 0 ].select( currentValue );
				} else {
					this.$refs[ filter.type ][ 0 ].reset();
				}
			}.bind( this ) );
		}
	} ),

	watch: {
		/**
		 * Programmatically set or reset filters if Vuex state changes for
		 * reasons other than the user setting filters manually (clicking the
		 * clear button, URL filter params, popstate, etc)
		 */
		currentActiveFilters: function () {
			this.synchronizeFilters();
		}
	},

	/**
	 * If filters have already been set at the time of page initialization
	 * via URL params, update the relevant Select child component with
	 * the appropriate value
	 */
	mounted: function () {
		this.synchronizeFilters();
	}
};
</script>
