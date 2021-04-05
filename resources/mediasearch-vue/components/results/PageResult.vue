<template>
	<div class="wbmi-page-result">
		<div class="wbmi-page-result__title">
			<span v-if="namespacePrefix" class="wbmi-page-result__namespace">
				{{ namespacePrefix }}
			</span>
			<h3 v-if="displayName">
				<a :href="canonicalurl"
					target="_blank"
					:title="title"
					@click="$emit('click')">
					{{ displayName }}
				</a>
			</h3>
		</div>

		<div v-if="snippet" v-html="snippet"></div>

		<p v-if="hasCategoryText"
			v-i18n-html:wikibasemediainfo-special-mediasearch-category-info="[
				formatNumber( categoryinfo.size ),
				formatNumber( categoryinfo.subcats ),
				formatNumber( categoryinfo.files )
			]">
		</p>

		<template v-else>
			<p v-if="size">
				{{ formatSize( size ) }}
			</p>

			<p v-if="wordcount"
				v-i18n-html:wikibasemediainfo-special-mediasearch-wordcount="[
					formatNumber( wordcount )
				]">
			</p>
		</template>

		<p v-if="lastEdited">
			- {{ lastEdited }}
		</p>
	</div>
</template>

<script>
/**
 * @file PageResult.vue
 *
 * Represents page and category results.
 */
var searchResult = require( '../../mixins/searchResult.js' ),
	userLanguage = mw.config.get( 'wgUserLanguage' );

// @vue/component
module.exports = {
	name: 'PageResult',

	mixins: [ searchResult ],

	inheritAttrs: false,

	props: {
		categoryinfo: {
			type: Object,
			default: function () {
				return {};
			}
		},

		size: {
			type: Number,
			default: null
		},

		wordcount: {
			type: Number,
			default: null
		},

		timestamp: {
			type: String,
			default: null
		},

		snippet: {
			type: String,
			default: null
		}
	},

	computed: {
		/**
		 * @return {boolean}
		 */
		hasCategoryText: function () {
			return Object.keys( this.categoryinfo ).length > 0;
		},

		/**
		 * @return {string|null}
		 */
		namespacePrefix: function () {
			var title = mw.Title.newFromText( this.title );

			if ( !title ) {
				return null;
			}

			// If this is the default namespace (gallery), getNamespacePrefix()
			// won't return anything, so we need to use this system message
			// instead, which is configured at MediaWiki:Blanknamespace.
			// Otherwise, return the namespace prefix with the trailing
			// colon stripped off.
			return title.getNamespaceId() === 0 ?
				// Main namespace, Gallery, without the parentheses
				mw.msg( 'blanknamespace' ).replace( /^[(]?/, '' ).replace( /[)]?$/, '' ) :
				// Namespace prefix, with no colon and space instead of underscore
				title.getNamespacePrefix().replace( /[:]?$/, '' ).replace( /_/g, ' ' );
		},

		/**
		 * Outputs time and date of last edit, in the user's language.
		 *
		 * Because we're outputting this per-language, the format will vary (e.g.
		 * in en and en-gb, the placement of the month and day will be swapped).
		 * That said, let's standardize on 24-hour time since that's what users
		 * are used to (and it's cleaner than having to add AM/PM).
		 *
		 * @return {string}
		 */
		lastEdited: function () {
			var date = new Date( this.timestamp ),
				timeString,
				dateString;

			if ( date instanceof Date ) {
				timeString = date.toLocaleString( userLanguage, {
					timeZone: 'UTC',
					hour: 'numeric',
					minute: 'numeric',
					hour12: false
				} );
				dateString = date.toLocaleString( userLanguage, {
					timeZone: 'UTC',
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				} );

				return timeString + ', ' + dateString;
			}

			return '';
		}
	}
};
</script>
