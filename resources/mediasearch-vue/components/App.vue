<template>
	<div class="" id="app">
		<search-input 
			v-bind:initial-term="term"
			v-on:update="onUpdateTerm"
		/>

		<tabs v-bind:active="currentTab" v-on:tab-change="onTabChange">
			<tab name="bitmap" v-bind:title="bitmapTabTitle">
				<search-results v-bind:results="sortedResults.bitmap" />
			</tab>

			<tab name="audio" v-bind:title="audioTabTitle">
				<search-results v-bind:results="sortedResults.audio" />
			</tab>

			<tab name="video" v-bind:title="videoTabTitle">
				<search-results v-bind:results="sortedResults.video" />
			</tab>

			<tab name="category" v-bind:title="categoryTabTitle">
				<search-results v-bind:results="sortedResults.category" />
			</tab>
		</tabs>
	</div>
</template>

<script>
var mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	mapMutations = require( 'vuex' ).mapMutations,
	mapActions = require( 'vuex' ).mapActions,
	Tab = require( './base/Tab.vue' ),
	Tabs = require( './base/Tabs.vue' ),
	SearchInput = require( './SearchInput.vue' ),
	SearchResults = require( './SearchResults.vue' ),
	url = new mw.Uri();

module.exports = {
	name: 'MediaSearch',

	components: {
		tabs: Tabs,
		tab: Tab,
		'search-input': SearchInput,
		'search-results': SearchResults
	},

	data: function () {
		return {
			currentTab: url.query.type || '',
			term: url.query.q || ''
		};
	},

	computed: $.extend( {}, mapState( [
		'continue'
	] ), mapGetters( [
		'hasMore',
		'sortedResults'
	] ), {

		bitmapTabTitle: function () {
			return this.$i18n( 'wikibasemediainfo-special-mediasearch-tab-bitmap' ).text();
		},

		audioTabTitle: function () {
			return this.$i18n( 'wikibasemediainfo-special-mediasearch-tab-audio' ).text();
		},

		videoTabTitle: function () {
			return this.$i18n( 'wikibasemediainfo-special-mediasearch-tab-video' ).text();
		},

		categoryTabTitle: function () {
			return this.$i18n( 'wikibasemediainfo-special-mediasearch-tab-category' ).text();
		}
	} ),

	methods: $.extend( {}, mapMutations( [
		'resetResults'
	] ), mapActions( [
		'search'
	] ), {
		onTabChange: function ( newTab ) {
			this.currentTab = newTab.name;
			this.getMoreResultsForTabIfAvailable( newTab.name );
		},

		onUpdateTerm: function ( newTerm ) {
			this.term = newTerm;
		},

		/**
		 * Determine if we have more data to load for the tab; If so, make an
		 * API request to get them, and add them to the appropriate queue.
		 * Finally, update "continue" and/or "hasmore" properties based on the
		 * results of the latest request.
		 */
		getMoreResultsForTabIfAvailable: function ( tab ) {
			if ( this.hasMore[ tab ] ) {
				this.search( {
					term: this.term,
					type: this.currentTab
				} );
			} else {
				// do nothing
			}
		},

		/**
		 * 
		 */
		performNewSearch: function () {
			this.resetResults();

			this.search( { 
				term: this.term,
				type: this.currentTab 
			} );
		}
	} ),

	watch: {
		/**
		 * Ensure that "type" query params stay in sync with current active tab
		 * in the UI
		 */
		currentTab: function ( newTab ) {
			url.query.type = newTab;
			window.history.replaceState( null, null, '?' + url.getQueryString() );
		},

		/**
		 * Ensure that the "q" query params stay in sync with current query
		 * input from user
		 */
		term: function ( newTerm, oldTerm ) {
			url.query.q = newTerm;
			window.history.replaceState( null, null, '?' + url.getQueryString() )

			if ( newTerm && newTerm !== oldTerm ) {
				this.performNewSearch();
			}
		}
	},

	/**
	 * Watch the URL for changes to query params
	 */
	mounted: function () {
	},

	beforeDestroy: function () {
	}
};
</script>

<style lang="less">

</style>