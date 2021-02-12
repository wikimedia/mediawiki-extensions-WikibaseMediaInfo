<template>
	<div class="wbmi-other-result">
		<a v-if="thumbnail"
			class="wbmi-other-result__thumbnail-wrapper"
			:href="canonicalurl"
			:title="title"
			:style="style"
			target="_blank"
			@click="$emit('click')"
		>
			<wbmi-image
				:source="thumbnail"
				:alt="displayName"
			></wbmi-image>
		</a>
		<div class="wbmi-other-result__text">
			<h3>
				<a :href="canonicalurl"
					target="_blank"
					:title="title"
					@click="$emit('click')">
					{{ displayName }}
				</a>
			</h3>
			<p class="wbmi-other-result__meta">
				<span class="wbmi-other-result__extension">
					{{ extension }}
				</span>

				<span dir="ltr">{{ resolution }}</span>

				<span v-if="imageSize"
					v-i18n-html:wikibasemediainfo-special-mediasearch-image-size="[
						formatSize( imageSize )
					]">
				</span>
			</p>
		</div>
	</div>
</template>

<script>
var WbmiImage = require( './../base/Image.vue' );

/**
 * @file OtherResult.vue
 *
 * Represents mediatypes other than bitmap, audio, and video.
 */
var searchResult = require( '../../mixins/searchResult.js' );

// @vue/component
module.exports = {
	name: 'OtherResult',

	components: {
		'wbmi-image': WbmiImage
	},

	mixins: [ searchResult ],

	inheritAttrs: false,

	computed: {
		/**
		 * Use mw.Title to get a normalized title without File, Category, etc. prepending
		 *
		 * @return {string}
		 */
		displayName: function () {
			return new mw.Title( this.title ).getMainText();
		},

		/**
		 * Get file extension.
		 *
		 * @return {string}
		 */
		extension: function () {
			return new mw.Title( this.title ).getExtension().toUpperCase();
		},

		/**
		 * @return {string|null}
		 */
		resolution: function () {
			var width = this.imageinfo[ 0 ].width,
				height = this.imageinfo[ 0 ].height;

			if ( this.imageinfo && width && height ) {
				return this.formatNumber( width ) + ' × ' + this.formatNumber( height );
			} else {
				return null;
			}
		},

		/**
		 * Raw image size.
		 *
		 * @return {number|null}
		 */
		imageSize: function () {
			return this.imageinfo[ 0 ].size ? this.imageinfo[ 0 ].size : null;
		},

		/**
		 * @return {string|undefined}
		 */
		thumbnail: function () {
			return this.imageinfo[ 0 ].thumburl;
		},

		/**
		 * @return {number}
		 */
		thumbheight: function () {
			return this.imageinfo[ 0 ].thumbheight;
		},

		/**
		 * @return {number}
		 */
		thumbwidth: function () {
			return this.imageinfo[ 0 ].thumbwidth;
		},

		/**
		 * @return {Object} style object with width and height properties
		 */
		style: function () {
			var desiredWidth = 120;

			return {
				width: desiredWidth + 'px',
				height: Math.round( this.thumbheight / this.thumbwidth * desiredWidth ) + 'px'
			};
		}
	}
};
</script>
