<template>
	<div class="wbmi-copy-text-layout" :class="rootClasses">
		<span class="wbmi-copy-text-layout__text">
			{{ copyText }}
		</span>
		<wbmi-button
			class="wbmi-copy-text-layout__button"
			:progressive="true"
			:frameless="true"
			@click="handleCopyText"
		>
			{{ buttonText }}
		</wbmi-button>
	</div>
</template>

<script>
var WbmiButton = require( './Button.vue' );

/**
 * Text with a button that copies the text to the user's clipboard.
 */
// @vue/component
module.exports = {
	name: 'WbmiCopyTextLayout',

	components: {
		'wbmi-button': WbmiButton
	},

	props: {
		/**
		 * The text to be copied.
		 */
		copyText: {
			type: String,
			required: true
		},

		buttonText: {
			type: [ String, Object ],
			default: function () {
				return this.$i18n( 'wikibasemediainfo-copytextlayout-copy' );
			}
		},

		/**
		 * Set to true to wrap component in a span instead of a div.
		 */
		inline: {
			type: Boolean
		},

		/**
		 * Set to true to create a single-line that hides text overflow with an
		 * ellipsis. Otherwise, text will wrap onto subsequent lines normally.
		 */
		hideOverflow: {
			type: Boolean
		},

		successMessage: {
			type: [ String, Object ],
			default: function () {
				return this.$i18n( 'wikibasemediainfo-copytextlayout-copy-success' );
			}
		},

		failMessage: {
			type: [ String, Object ],
			default: function () {
				return this.$i18n( 'wikibasemediainfo-copytextlayout-copy-fail' );
			}
		}
	},

	computed: {
		rootClasses: function () {
			return {
				'wbmi-copy-text-layout--hide-overflow': this.hideOverflow,
				'wbmi-copy-text-layout--inline': this.inline && !this.hideOverflow
			};
		},

		elementType: function () {
			return this.inline ? 'span' : 'div';
		}
	},

	methods: {
		/**
		 * Try to copy text to the user's clipboard and inform them of results.
		 */
		handleCopyText: function () {
			var textarea = document.createElement( 'textarea' ),
				copied;

			// Create a textarea element with our copy text.
			textarea.value = this.copyText;

			// Make sure it can't be edited.
			textarea.setAttribute( 'readonly', '' );

			// Make the textarea invisible and add to the DOM.
			textarea.style.position = 'absolute';
			textarea.style.left = '-9999px';
			document.body.appendChild( textarea );

			// Select and try to copy the text.
			textarea.select();

			try {
				copied = document.execCommand( 'copy' );
			} catch ( e ) {
				copied = false;
			}

			// Show a success or failure message.
			if ( copied ) {
				mw.notify( this.successMessage );
			} else {
				mw.notify( this.failMessage, { type: 'error' } );
			}

			// Remove the textarea element.
			document.body.removeChild( textarea );
		}
	}

};
</script>
