<template>
	<div class="wbmi-media-search-filters-wrapper" :class="rootClasses">
		<div class="wbmi-media-search-filters">
			<template v-for="( filter, index ) in searchFilters">
				<div
					:key="'filter-' + index"
				>
					<wbmi-select
						v-if="filter.type !== 'namespace'"
						:ref="filter.type"
						:class="getFilterClasses( filter.type )"
						:name="filter.type"
						:items="filter.items"
						:initial-selected-item-index="0"
						:prefix="getFilterPrefix( filter.type )"
						@select="onSelect( $event, filter.type )"
					>
					</wbmi-select>

					<wvui-button
						v-else
						:key="'filter-namespace-' + index"
						class="wbmi-media-search-filters__namespace"
						:class="namespaceFilterClasses"
						:frameless="true"
						@click="namespaceFilterDialogActive = true"
					>
						{{ namespaceFilterLabel }}
					</wvui-button>

					<wbmi-observer
						v-if="index === searchFilters.length - 1 && supportsObserver"
						:key="'filter-observer-' + index"
						@intersect="removeGradientClass"
						@hide="addGradientClass"
					></wbmi-observer>
				</div>
			</template>
			<span v-if="showResultsCount" class="wbmi-media-search-results-count">
				{{ resultsCount }}
			</span>
		</div>

		<namespace-filter-dialog
			v-if="namespaceFilter"
			ref="namespace"
			:items="namespaceFilter.items"
			:namespaces="namespaceFilter.data.namespaceGroups.all"
			:namespace-groups="namespaceFilter.data.namespaceGroups"
			:active="namespaceFilterDialogActive"
			@submit="onSelect( $event, 'namespace' )"
			@close="namespaceFilterDialogActive = false"
		>
		</namespace-filter-dialog>
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
	WbmiButton = require( './base/Button.vue' ),
	NamespaceFilterDialog = require( './NamespaceFilterDialog.vue' ),
	SearchFilter = require( '../models/SearchFilter.js' ),
	searchOptions = require( './../data/searchOptions.json' );

// @vue/component
module.exports = {
	name: 'SearchFilters',

	components: {
		'wbmi-select': WbmiSelect,
		'wbmi-observer': WbmiObserver,
		'wvui-button': WbmiButton,
		'namespace-filter-dialog': NamespaceFilterDialog
	},

	props: {
		mediaType: {
			type: String,
			required: true
		}
	},

	data: function () {
		return {
			hasGradient: false,
			namespaceFilterDialogActive: false
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

		namespaceFilterClasses: function () {
			var selected = ( 'namespace' in this.filterValues[ this.mediaType ] );
			return {
				'wbmi-media-search-filters__namespace--selected': selected
			};
		},

		/**
		 * @return {Array} SearchFilter objects for this media type.
		 */
		searchFilters: function () {
			var optionsForType = searchOptions[ this.mediaType ],
				filters = [];

			Object.keys( optionsForType ).forEach( function ( filterName ) {
				var filterData = optionsForType[ filterName ],
					filter = new SearchFilter(
						filterName,
						filterData.items,
						filterData.data
					);
				filters.push( filter );
			} );
			return filters;
		},

		/**
		 * Key names (not values) of all active filters for the given tab;
		 * Having a shorthand computed property for this makes it easier to
		 * watch for changes.
		 *
		 * @return {Array} Empty array or [ "imageres", "filemime" ], etc
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
		},

		/**
		 * Get a human-readable label for the namespace filter button.
		 *
		 * @return {Object}
		 */
		namespaceFilterLabel: function () {
			var namespaceGroups = this.namespaceFilter.data.namespaceGroups,
				messageKey,
				filterValue = 'all';

			// If there is a namespace filter value...
			if ( 'namespace' in this.filterValues[ this.mediaType ] ) {
				// If the filter value is one of the namespace groups, use that.
				// Otherwise, it's a string of custom namespaces, so use the
				// 'custom' label.
				filterValue = namespaceGroups[ this.filterValues[ this.mediaType ].namespace ] ?
					this.filterValues[ this.mediaType ].namespace : 'custom';
			}

			messageKey = 'wikibasemediainfo-special-mediasearch-filter-namespace-' + filterValue;

			// Return the label message, which takes the filter value as a
			// param and will return something like "Namespace: Discussion".
			// The following messages are used here:
			// * wikibasemediainfo-special-mediasearch-filter-namespace-all
			// * wikibasemediainfo-special-mediasearch-filter-namespace-discussion
			// * wikibasemediainfo-special-mediasearch-filter-namespace-help
			// * wikibasemediainfo-special-mediasearch-filter-namespace-custom
			return this.$i18n(
				'wikibasemediainfo-special-mediasearch-filter-namespace-label',
				this.$i18n( messageKey )
			);
		},

		/**
		 * Get the namespace search filter, if it exists.
		 *
		 * @return {Object|undefined}
		 */
		namespaceFilter: function () {
			// Array.prototype.find is polyfilled so we can use this
			// ES6 array method here

			// eslint-disable-next-line no-restricted-syntax
			return this.searchFilters.find( function ( filter ) {
				return filter.type === 'namespace';
			} );
		}
	} ),

	methods: $.extend( {}, mapMutations( [
		'addFilterValue',
		'removeFilterValue'
	] ), {
		/**
		 * Handle filter change.
		 *
		 * @param {string|Object} value The new filter value; namespace filter values are objects
		 * @param {string} filterType
		 * @fires filter-change
		 */
		onSelect: function ( value, filterType ) {
			var oldValue = this.filterValues[ this.mediaType ][ filterType ] || '';

			// for logging purposes, we only want a simple string value
			function normalizedValue( v ) {
				return v.value ? v.value : v;
			}

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
					search_filter_value: normalizedValue( value ),
					prior_search_filter_type: filterType,
					prior_search_filter_value: normalizedValue( oldValue )
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
					prior_search_filter_value: normalizedValue( oldValue )
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

		/**
		 * Get the ref for a filter.
		 *
		 * Because the namespace filter is handled outside the v-for loop that
		 * creates the other filter elements, we need to access its ref a little
		 * differently.
		 *
		 * @param {Object} filter A search filter object
		 * @return {Object}
		 */
		getRef: function ( filter ) {
			return filter.type === 'namespace' ?
				this.$refs[ filter.type ] :
				this.$refs[ filter.type ][ 0 ];
		},

		resetAllFilters: function () {
			this.searchFilters.forEach( function ( filter ) {
				this.getRef( filter ).reset();
			}.bind( this ) );
		},

		/**
		 * Set each filter component's state to match the appropriate
		 * value in Vuex
		 */
		synchronizeFilters: function () {
			this.searchFilters.forEach( function ( filter ) {
				var currentValue = this.filterValues[ this.mediaType ][ filter.type ],
					ref = this.getRef( filter );

				if ( currentValue ) {
					ref.select( currentValue );
				} else {
					ref.reset();
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
