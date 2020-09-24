<template>
	<div class="wbmi-other-result">
		<a v-if="thumbnail"
			class="wbmi-image-result"
			:href="canonicalurl"
			:title="title"
			:style="style"
			target="_blank"
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
				>
					{{ displayName }}
				</a>
			</h3>
			<p class="wbmi-other-result__meta">
				<span class="wbmi-other-result__extension">
					{{ extension }}
				</span>
				{{ resolution }}
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
// @vue/component
module.exports = {
	name: 'OtherResult',

	components: {
		'wbmi-image': WbmiImage
	},

	inheritAttrs: false,

	props: {
		title: {
			type: String,
			required: true
		},

		canonicalurl: {
			type: String,
			required: true
		},

		imageinfo: {
			type: Array,
			required: false,
			default: function () {
				return [ {} ];
			}
		}
	},

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
				return width + ' × ' + height;
			} else {
				return null;
			}
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
			return {
				width: this.thumbwidth + 'px',
				height: this.thumbheight + 'px'
			};
		}
	}
};
</script>
