<template>
	<div id="app">
		<search-input
			:initial-term="term"
			@update="onUpdateTerm"
			@clear="onClear">
		</search-input>

		<!-- Generate a tab for each key in the "results" object. Data types,
		messages, and loading behavior are bound to this key. -->
		<tabs :active="currentTab" @tab-change="onTabChange">
			<tab v-for="tab in tabs"
				:key="tab"
				:name="tab"
				:title="tabNames[ tab ]">
				<search-results
					:media-type="tab"
					:enable-quick-view="enableQuickView">
				</search-results>

				<observer @intersect="getMoreResultsForTabIfAvailable( tab )">
				</observer>

				<mw-spinner v-if="pending[ tab ]">
				</mw-spinner>

				<template v-else-if="hasNoResults( tab )">
					<no-results></no-results>
				</template>

				<template v-else-if="shouldShowEmptyState">
					<empty-state></empty-state>
				</template>
			</tab>
		</tabs>
	</div>
</template>

<script>
/**
 * @file App.vue
 *
 * Top-level component for the Special:MediaSearch JS UI.
 * Contains two major elements:
 * - search input
 * - tabs to display search results (one for each media type)
 *
 * Search query and search result data lives in Vuex, but this component
 * responds to user interactions like changes in query or tab, dispatches
 * Vuex actions to make API requests, and ensures that the URL parameters
 * remain in sync with the current search term and active tab (this is done
 * using history.replaceState)
 */
var mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	mapMutations = require( 'vuex' ).mapMutations,
	mapActions = require( 'vuex' ).mapActions,
	Tab = require( './base/Tab.vue' ),
	Tabs = require( './base/Tabs.vue' ),
	SearchInput = require( './SearchInput.vue' ),
	SearchResults = require( './SearchResults.vue' ),
	NoResults = require( './NoResults.vue' ),
	Observer = require( './base/Observer.vue' ),
	Spinner = require( './Spinner.vue' ),
	EmptyState = require( './EmptyState.vue' ),
	url = new mw.Uri();

// @vue/component
module.exports = {
	name: 'MediaSearch',

	components: {
		tabs: Tabs,
		tab: Tab,
		'search-input': SearchInput,
		'search-results': SearchResults,
		observer: Observer,
		'mw-spinner': Spinner,
		'empty-state': EmptyState,
		'no-results': NoResults
	},

	data: function () {
		return {
			currentTab: url.query.type || '',
			// temporary feature flag for QuickView feature: ?quickview=true
			// params must be present in URL; the actual value of the param
			// doesn't matter, just provide something to enable
			enableQuickView: !!url.query.quickview
		};
	},

	computed: $.extend( {}, mapState( [
		'term',
		'results',
		'continue',
		'pending'
	] ), mapGetters( [
		'hasMore'
	] ), {

		/**
		 * @return {string[]} [ 'bitmap', 'video', 'audio', 'category' ]
		 */
		tabs: function () {
			return Object.keys( this.results );
		},

		/**
		 * @return {Object} { bitmap: 'Images', video: 'Video', category: 'Categories'... }
		 */
		tabNames: function () {
			var names = {},
				prefix = 'wikibasemediainfo-special-mediasearch-tab-';

			// Get the i18n message for each tab title and assign to appropriate
			// key in returned object
			this.tabs.forEach( function ( tab ) {
				names[ tab ] = this.$i18n( prefix + tab ).text();
			}.bind( this ) );

			return names;
		},

		/**
		 * Whether to show the pre-search empty state; show this whenever a
		 * search term is not present and there are no results to display
		 *
		 * @return {boolean}
		 */
		shouldShowEmptyState: function () {
			return this.term.length === 0 &&
				this.results[ this.currentTab ].length === 0;
		}
	} ),

	methods: $.extend( {}, mapMutations( [
		'clearTerm',
		'resetResults',
		'setTerm'
	] ), mapActions( [
		'search',
		'fetchFileCount'
	] ), {
		/**
		 * @param {Object} newTab
		 * @param {string} newTab.name
		 */
		onTabChange: function ( newTab ) {
			this.currentTab = newTab.name;
			this.getMoreResultsForTabIfAvailable( newTab.name );
		},

		/**
		 * @param {string} newTerm
		 */
		onUpdateTerm: function ( newTerm ) {
			this.setTerm( newTerm );
		},

		/**
		 * Dispatch Vuex actions to clear existing term and results whenever a
		 * "clear" event is detected
		 */
		onClear: function () {
			this.clearTerm();
			this.resetResults();
		},

		/**
		 * @param {string} tab bitmap, audio, etc.
		 */
		getMoreResultsForTabIfAvailable: function ( tab ) {
			// Don't make API requests if the search term is empty
			if ( this.term === '' ) {
				return;
			}

			if ( this.hasMore[ tab ] && !this.pending[ tab ] ) {
				// If more results are available, and if another request is not
				// already pending, then launch a search request
				this.search( {
					term: this.term,
					type: this.currentTab
				} );
			} else if ( this.hasMore[ tab ] && this.pending[ tab ] ) {
				// If more results are available but another request is
				// currently in-flight, attempt to make the request again
				// after some time has passed
				window.setTimeout(
					this.getMoreResultsForTabIfAvailable.bind( this, tab ),
					2000
				);
			}
		},

		/**
		 * Dispatch Vuex actions to clear existing results and fetch new ones
		 */
		performNewSearch: function () {
			this.resetResults();

			this.search( {
				term: this.term,
				type: this.currentTab
			} );
		},

		/**
		 * Determine if a given tab should display a "no results found" message
		 *
		 * @param {string} tab
		 * @return {boolean}
		 *
		 */
		hasNoResults: function ( tab ) {
			return this.term.length > 0 && // user has entered a search term
				this.pending[ tab ] === false && // tab is not pending
				this.results[ tab ].length === 0 && // tab has no results
				this.continue[ tab ] === null; // query cannot be continued
		}
	} ),

	watch: {
		/**
		 * @param {string} newTab bitmap, audio, etc.
		 *
		 * Whenever the user changes tabs, modify the mw.url object's query
		 * type property and get a new query string. This is used to overwrite
		 * the current history state and change the visible URL.
		 */
		currentTab: function ( newTab ) {
			url.query.type = newTab;
			window.history.replaceState( null, null, '?' + url.getQueryString() );
		},

		/**
		 * @param {string} newTerm
		 * @param {string} oldTerm
		 *
		 * Whenever the user enters a new search term, modify the mw.url object's
		 * query property and get a new query string. This is used to overwrite
		 * the current history state and change the visible URL.
		 *
		 * If the new term does not match what previously existed here, perform
		 * a new search.
		 */
		term: function ( newTerm, oldTerm ) {
			url.query.q = newTerm;
			window.history.replaceState( null, null, '?' + url.getQueryString() );

			if ( newTerm && newTerm !== oldTerm ) {
				this.performNewSearch();
			}
		}
	},

	/**
	 * If user arrives on the page without URL params to specify initial search
	 * type / active tab, default to bitmap. This is done in created hook
	 * because some computed properties assume that a currentTab will always be
	 * specified; the created hook runs before computed properties are evaluated.
	 */
	created: function () {
		if ( this.currentTab === '' ) {
			this.currentTab = 'bitmap';
		}
	},

	/**
	 * Fetch a total count of media files for use in the empty state
	 */
	mounted: function () {
		this.fetchFileCount();

	}
};
</script>
