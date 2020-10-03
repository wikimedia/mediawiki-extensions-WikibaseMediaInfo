<template>
	<div class="wbmi-media-search-results">
		<div :class="listClasses"
			class="wbmi-media-search-results__list">
			<component
				:is="resultComponent"
				v-for="(result, index) in results[ mediaType ]"
				:ref="result.pageid"
				:key="index"
				:class="getResultClass( result.pageid )"
				v-bind="result"
				@show-details="showDetails">
			</component>
		</div>

		<!-- QuickView dialog for mobile skin. -->
		<template v-if="isMobileSkin">
			<wbmi-dialog
				v-if="details"
				class="wbmi-media-search-results__details-dialog"
				:no-header="true"
				:fullscreen="true"
				@close="hideDetails"
				@key="onDialogKeyup"
			>
				<quick-view
					ref="quickview"
					:key="details.pageid"
					v-bind="details"
					:media-type="mediaType"
					:is-dialog="true"
					@close="hideDetails"
					@previous="changeQuickViewResult( $event, -1 )"
					@next="changeQuickViewResult( $event, 1 )"
				></quick-view>
			</wbmi-dialog>
		</template>

		<!-- QuickView panel for desktop skin. -->
		<aside
			v-else
			class="wbmi-media-search-results__details"
			:class="{ 'wbmi-media-search-results__details--expanded': !!details }"
			:hidden="!details">
			<quick-view
				v-if="details"
				ref="quickview"
				:key="details.pageid"
				v-bind="details"
				:media-type="mediaType"
				@close="hideDetails"
				@previous="changeQuickViewResult( $event, -1 )"
				@next="changeQuickViewResult( $event, 1 )"
			>
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
	ImageResult = require( './results/ImageResult.vue' ),
	AudioResult = require( './results/AudioResult.vue' ),
	VideoResult = require( './results/VideoResult.vue' ),
	PageResult = require( './results/PageResult.vue' ),
	OtherResult = require( './results/OtherResult.vue' ),
	WbmiDialog = require( './base/Dialog.vue' ),
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
		'other-result': OtherResult,
		'quick-view': QuickView,
		'wbmi-dialog': WbmiDialog
	},

	props: {
		mediaType: {
			type: String,
			required: true
		}
	},

	data: function () {
		return {
			details: null,
			// Which quickview control to focus on when the panel opens.
			focusOn: 'close'
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
			} else {
				return this.mediaType + '-result';
			}
		},

		/**
		 * @return {Object} Dynamic classes for the "list" element
		 */
		listClasses: function () {
			var listTypeModifier = 'wbmi-media-search-results__list--' + this.mediaType,
				classObject = {
					'wbmi-media-search-results__list--collapsed': !!this.details && !this.isMobileSkin
				};

			// Without ES6 string interpolation generating a dynamic classname
			// as a key requires an extra step;
			classObject[ listTypeModifier ] = true;

			return classObject;
		},

		/**
		 * @return {boolean}
		 */
		isMobileSkin: function () {
			return mw.config.get( 'skin' ) === 'minerva';
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
		showDetails: function ( pageid ) {
			// @TODO show a placeholder Quickview UI immediately, and then
			// replace with the real data as soon as the request has completed
			this.fetchDetails( pageid ).then( function ( response ) {
				this.details = response.query.pages[ pageid ];

				// Let the QuickView component programatically manage focus
				// once it is displayed
				this.$nextTick( function () {
					this.$refs.quickview.focus( this.focusOn );
				}.bind( this ) );

				this.scrollIntoViewIfNeeded( pageid );
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
			this.focusOn = 'close';
		},

		/**
		 * Scroll through results in QuickView via arrow keys.
		 *
		 * @param {boolean} shouldChangeFocus
		 * @param {number} addend 1 for next, -1 for previous
		 */
		changeQuickViewResult: function ( shouldChangeFocus, addend ) {
			var tabResults = this.results[ this.mediaType ],
				currentItem = tabResults.filter( function ( result ) {
					return result.pageid === this.details.pageid;
				}.bind( this ) ),
				currentIndex = tabResults.indexOf( currentItem[ 0 ] ),
				nextIndex = currentIndex + addend;

			// If we're not surpassing either end of the results array, go to
			// the previous or next item.
			if ( nextIndex >= 0 && nextIndex < tabResults.length ) {
				this.showDetails( tabResults[ nextIndex ].pageid );
			}

			// When the user navigates between results via keyboard, we want the
			// new QuickView panel to focus on the just-pressed button when it
			// opens. Otherwise, we should remove focus from the close button
			// to avoid confusion for mouse-users.
			if ( shouldChangeFocus ) {
				this.focusOn = addend === 1 ? 'next' : 'previous';
			} else {
				this.focusOn = null;
			}
		},

		/**
		 * Scroll current QuickView result into view if it's not fully visible.
		 *
		 * @param {number} pageid
		 */
		scrollIntoViewIfNeeded: function ( pageid ) {
			var element = this.$refs[ pageid ][ 0 ].$el,
				bounds = element.getBoundingClientRect(),
				viewportHeight = window.innerHeight || document.documentElement.clientHeight,
				isAboveViewport = bounds.top < 0 || bounds.bottom < 0,
				isBelowViewport = bounds.top > viewportHeight || bounds.bottom > viewportHeight;

			if ( isAboveViewport ) {
				// Scroll into view and align to top.
				element.scrollIntoView();
			}

			if ( isBelowViewport ) {
				// Scroll into view and align to bottom.
				element.scrollIntoView( false );
			}
		},

		/**
		 * Look for arrow keyups on dialog.
		 *
		 * @param {string} code KeyboardEvent.code
		 */
		onDialogKeyup: function ( code ) {
			if ( code === 'ArrowRight' ) {
				this.changeQuickViewResult( true, 1 );
			}

			if ( code === 'ArrowLeft' ) {
				this.changeQuickViewResult( true, -1 );
			}
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
				inprop: 'url',
				pageids: pageid
			};

			// Set special params for audio/video files
			if ( this.mediaType === 'video' || this.mediaType === 'audio' ) {
				params.prop = 'info|videoinfo|pageterms';
				params.viprop = 'url|size|mime|extmetadata|derivatives';
				params.viurlwidth = 640;
			} else {
				params.prop = 'info|imageinfo|pageterms';
				params.iiprop = 'url|size|mime|extmetadata';
				params.iiurlheight = this.mediaType === 'bitmap' ? 180 : undefined;
			}

			// Test version: use production commons API
			// return $.get( 'https://commons.wikimedia.org/w/api.php', params );

			// Real version: use mw.api
			return api.get( params );
		},

		/**
		 * @param {number} pageid
		 * @return {Object}
		 */
		getResultClass: function ( pageid ) {
			return {
				'wbmi-media-search-result--highlighted': this.details && this.details.pageid === pageid
			};
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
