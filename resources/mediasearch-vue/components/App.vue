<template>
	<div id="app">
		<wbmi-autocomplete-search-input
			class="wbmi-media-search-input"
			name="wbmi-media-search-input"
			:label="$i18n( 'wikibasemediainfo-special-mediasearch-input-label' )"
			:initial-value="term"
			:placeholder="$i18n( 'wikibasemediainfo-special-mediasearch-input-placeholder' )"
			:clear-title="$i18n( 'wikibasemediainfo-special-mediasearch-clear-title' )"
			:button-label="$i18n( 'searchbutton' )"
			:lookup-results="lookupResults"
			@input="getLookupResults"
			@submit="onUpdateTerm"
			@clear="onClear"
			@clear-lookup-results="clearLookupResults"
		>
		</wbmi-autocomplete-search-input>

		<!-- Generate a tab for each key in the "results" object. Data types,
		messages, and loading behavior are bound to this key. -->
		<wbmi-tabs :active="currentTab" @tab-change="onTabChange">
			<wbmi-tab v-for="tab in tabs"
				:key="tab"
				:name="tab"
				:title="tabNames[ tab ]">
				<search-results
					:media-type="tab"
					:enable-quick-view="enableQuickView">
				</search-results>

				<observer @intersect="getMoreResultsForTabIfAvailable( tab )">
				</observer>

				<spinner v-if="pending[ tab ]">
				</spinner>

				<template v-else-if="hasNoResults( tab )">
					<no-results></no-results>
				</template>

				<template v-else-if="shouldShowEmptyState">
					<empty-state></empty-state>
				</template>
			</wbmi-tab>
		</wbmi-tabs>
	</div>
</template>

<script>
/**
 * @file App.vue
 *
 * Top-level component for the Special:MediaSearch JS UI.
 * Contains two major elements:
 * - autocomplete search input
 * - tabs to display search results (one for each media type)
 *
 * Search query and search result data lives in Vuex, but this component
 * responds to user interactions like changes in query or tab, dispatches
 * Vuex actions to make API requests, and ensures that the URL parameters
 * remain in sync with the current search term and active tab (this is done
 * using history.replaceState)
 *
 * Autocomplete lookups are handled by a mixin. When new search input is
 * emitted from the AutocompleteSearchInput, the mixin handles the lookup
 * request and this component passes an array of string lookup results to the
 * AutocompleteSearchInput for display.
 */
var mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	mapMutations = require( 'vuex' ).mapMutations,
	mapActions = require( 'vuex' ).mapActions,
	WbmiAutocompleteSearchInput = require( './base/AutocompleteSearchInput.vue' ),
	WbmiTab = require( './base/Tab.vue' ),
	WbmiTabs = require( './base/Tabs.vue' ),
	SearchResults = require( './SearchResults.vue' ),
	NoResults = require( './NoResults.vue' ),
	Observer = require( './base/Observer.vue' ),
	Spinner = require( './Spinner.vue' ),
	EmptyState = require( './EmptyState.vue' ),
	autocompleteLookupHandler = require( './../mixins/autocompleteLookupHandler.js' ),
	url = new mw.Uri();

// @vue/component
module.exports = {
	name: 'MediaSearch',

	components: {
		'wbmi-tabs': WbmiTabs,
		'wbmi-tab': WbmiTab,
		'wbmi-autocomplete-search-input': WbmiAutocompleteSearchInput,
		'search-results': SearchResults,
		observer: Observer,
		spinner: Spinner,
		'empty-state': EmptyState,
		'no-results': NoResults
	},

	mixins: [ autocompleteLookupHandler ],

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
		 * Keep UI state, URL, and history in sync as the user changes tabs
		 *
		 * @param {Object} newTab
		 * @param {string} newTab.name
		 */
		onTabChange: function ( newTab ) {
			this.currentTab = newTab.name;
			url.query.type = newTab.name;
			window.history.pushState( url.query, null, '?' + url.getQueryString() );
		},

		/**
		 * Keep the UI state, URL, and history in sync as the user changes
		 * search queries
		 *
		 * @param {string} newTerm
		 */
		onUpdateTerm: function ( newTerm ) {
			this.setTerm( newTerm );
			url.query.q = newTerm;
			window.history.pushState( url.query, null, '?' + url.getQueryString() );
		},

		/**
		 * Dispatch Vuex actions to clear existing term and results whenever a
		 * "clear" event is detected. Update the URL and history as well.
		 */
		onClear: function () {
			this.clearTerm();
			this.clearLookupResults();
			this.resetResults();
			url.query.q = '';
			window.history.pushState( url.query, null, '?' + url.getQueryString() );
		},

		/**
		 * @param {PopStateEvent} e
		 * @param {Object} [e.state]
		 */
		onPopState: function ( e ) {
			// If the newly-active history entry includes a state object, use it
			// to reset the URL query params and the UI state
			if ( e.state ) {
				this.setTerm( e.state.q || '' );
				this.currentTab = e.state.type;

				// Also update the mw.Uri object since we use it to generate
				// future states
				url.query.q = this.term;
				url.query.type = this.currentTab;
			}
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
		 * When the currentTab changes, fetch more results for the new tab if
		 * available
		 *
		 * @param {string} newTab bitmap, audio, etc.
		 * @param {string} oldTab bitmap, audio, etc.
		 */
		currentTab: function ( newTab, oldTab ) {
			if ( newTab && newTab !== oldTab ) {
				this.getMoreResultsForTabIfAvailable( newTab );
			}

		},

		/**
		 * If the new term does not match what previously existed here, perform
		 * a new search.
		 *
		 * @param {string} newTerm
		 * @param {string} oldTerm
		 */
		term: function ( newTerm, oldTerm ) {
			if ( newTerm && newTerm !== oldTerm ) {
				this.performNewSearch();
			}
		}
	},

	created: function () {
		// If user arrives on the page without URL params to specify initial search
		// type / active tab, default to bitmap. This is done in created hook
		// because some computed properties assume that a currentTab will always be
		// specified; the created hook runs before computed properties are evaluated.
		if ( this.currentTab === '' ) {
			this.currentTab = 'bitmap';
			url.query.type = 'bitmap';

			// history.pushState is used for changes the user makes, but this
			// first change is more of an auto-correction; we don't want to record
			// a new history entry for it
			window.history.replaceState( url.query, null, '?' + url.getQueryString() );
		}

		// Set up a listener for popState events in case the user navigates
		// through their history stack. Previous search queries should be
		// re-created when this happens, and URL params and UI state should
		// remain in sync

		// First, create a bound handler function and reference it for later removal
		this.boundOnPopState = this.onPopState.bind( this );

		// Set up the event listener
		window.addEventListener( 'popstate', this.boundOnPopState );
	},

	mounted: function () {
		// Fetch a total count of media files for use in the empty state
		this.fetchFileCount();

	},

	beforeDestroy: function () {
		window.removeEventListener( 'popstate', this.boundOnPopState );
	}
};
</script>

<style lang="less">
@import '../../mediainfo-variables.less';

.wbmi-media-search-input {
	max-width: @max-width-base;

	// See: https://phabricator.wikimedia.org/T222283
	// This overrides an override in mediawiki.legacy/shared.css which keeps
	// this input element from flipping over to RTL orientation;
	// stylelint-disable-next-line selector-class-pattern
	body.rtl.sitedir-ltr & input {
		direction: unset;
	}
}
</style>
