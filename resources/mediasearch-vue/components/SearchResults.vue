<template>
	<div class="wbmi-media-search-results">
		<div :class="listClasses"
			class="wbmi-media-search-results__list">
			<component
				:is="resultComponent"
				v-for="(result, index) in results[ mediaType ]"
				:ref="result.pageid"
				:key="index"
				v-bind="result"
				@show-details="showDetails">
			</component>
		</div>

		<aside
			class="wbmi-media-search-results__details"
			:class="{ 'wbmi-media-search-results__details--expanded': !!details }"
			:hidden="!details">
			<quick-view
				v-if="details"
				ref="quickview"
				:key="details.pageid"
				v-bind="details"
				:media-type="mediaType"
				@close="hideDetails">
			</quick-view>
		</aside>
	</div>
</template>

<script>
/**
 * @file SearchResults.vue
 *
 * The SearchResults component is responsible for displaying a list or grid of
 * search results, regardless of media type. Appearance and behavior will vary
 * depending on the value of the mediaType prop.
 *
 * This component can also display a "quickview" preview element for a given
 * result, including some additional data fetched from the API.
 */
var mapState = require( 'vuex' ).mapState,
	ImageResult = require( './ImageResult.vue' ),
	AudioResult = require( './AudioResult.vue' ),
	VideoResult = require( './VideoResult.vue' ),
	PageResult = require( './PageResult.vue' ),
	QuickView = require( './QuickView.vue' ),
	api = new mw.Api();

// @vue/component
module.exports = {
	name: 'SearchResults',

	components: {
		'image-result': ImageResult,
		'video-result': VideoResult,
		'audio-result': AudioResult,
		'page-result': PageResult,
		'quick-view': QuickView
	},

	props: {
		mediaType: {
			type: String,
			required: true
		},

		enableQuickView: {
			type: Boolean
		}
	},

	data: function () {
		return {
			details: null
		};
	},

	computed: $.extend( {}, mapState( [
		'term',
		'results',
		'pending'
	] ), {
		/**
		 * Which component should be used to display individual search results
		 *
		 * @return {string} image-result|video-result|page-result
		 */
		resultComponent: function () {
			if ( this.mediaType === 'bitmap' ) {
				return 'image-result';
			} else if ( this.mediaType === 'video' ) {
				return 'video-result';
			} else if ( this.mediaType === 'audio' ) {
				return 'audio-result';
			} else {
				return 'page-result';
			}
		},

		/**
		 * @return {Object} Dynamic classes for the "list" element
		 */
		listClasses: function () {
			var listTypeModifier = 'wbmi-media-search-results__list--' + this.mediaType,
				classObject = {
					'wbmi-media-search-results__list--collapsed': !!this.details
				};

			// Without ES6 string interpolation generating a dynamic classname
			// as a key requires an extra step;
			classObject[ listTypeModifier ] = true;

			return classObject;
		}
	} ),

	methods: {
		/**
		 * Store the results of the fetchDetails API request as `this.details`
		 * so that it can be passed to the QuickView component.
		 *
		 * @param {number} pageid
		 * @param {string} originalUrl
		 */
		showDetails: function ( pageid, originalUrl ) {
			// Do not show the Quickview unless the feature has been enabled
			if ( !this.enableQuickView ) {
				window.open( originalUrl, '_blank' );
				return;
			}

			// @TODO show a placeholder Quickview UI immediately, and then
			// replace with the real data as soon as the request has completed
			this.fetchDetails( pageid ).then( function ( response ) {
				this.details = response.query.pages[ pageid ];

				// Let the QuickView component programatically manage focus
				// once it is displayed
				this.$nextTick( function () {
					this.$refs.quickview.focus();
				}.bind( this ) );

			}.bind( this ) );
		},
		/**
		 * Reset details data to null. Restores focus to the originating result
		 * if an optional argument is provided.
		 *
		 * @param {boolean} restoreFocus
		 */
		hideDetails: function ( restoreFocus ) {
			var originatingResultId;

			if ( restoreFocus ) {
				originatingResultId = this.details.pageid;
				this.$refs[ originatingResultId ][ 0 ].focus();
			}

			this.details = null;
		},
		/**
		 * Make an API request for basic image information plus extended
		 * metadata
		 *
		 * @param {number} pageid
		 * @return {jQuery.Deferred}
		 */
		fetchDetails: function ( pageid ) {
			var params = {
				format: 'json',
				uselang: mw.config.get( 'wgUserLanguage' ),
				action: 'query',
				prop: 'info|imageinfo|pageterms',
				iiprop: 'url|size|mime|extmetadata',
				iiurlheight: this.mediaType === 'bitmap' ? 180 : undefined,
				iiurlwidth: this.mediaType === 'video' ? 200 : undefined,
				inprop: 'url',
				pageids: pageid
			};

			// Test version: use production commons API
			// return $.get( 'https://commons.wikimedia.org/w/api.php', params );

			// Real version: use mw.api
			return api.get( params );
		}
	},

	watch: {
		// if search term changes, immediately discard any expanded detail view
		term: function ( /* newTerm */ ) {
			this.details = null;
		}
	}
};
</script>
