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
				return this.$i18n( 'wikibasemediainfo-special-mediasearch-copytextlayout-copy' );
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
				return this.$i18n( 'wikibasemediainfo-special-mediasearch-copytextlayout-copy-success' );
			}
		},

		failMessage: {
			type: [ String, Object ],
			default: function () {
				return this.$i18n( 'wikibasemediainfo-special-mediasearch-copytextlayout-copy-fail' );
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
				range = document.createRange(),
				selection,
				copied;

			// Set the value of the textarea to our copytext.
			textarea.textContent = this.copyText;

			// Earlier iOS versions need contenteditable to be true.
			textarea.contentEditable = true;

			// Make sure the textarea isn't editable.
			textarea.readOnly = true;

			// Make the textarea invisible and add to the DOM.
			textarea.style.position = 'absolute';
			textarea.style.left = '-9999px';
			document.body.appendChild( textarea );

			// Use a range and a selection to grab the contents of the textarea.
			// In most modern browsers we could just do textarea.select(), but
			// iOS versions below 14 don't implement this.
			range.selectNodeContents( textarea );
			selection = window.getSelection();
			selection.removeAllRanges();
			selection.addRange( range );
			// Set this to a huge number to make sure we're getting the entire
			// selection.
			textarea.setSelectionRange( 0, this.copyText.length );

			// Set contenteditable to false just to be safe.
			textarea.contentEditable = false;

			// Try to copy the text.
			try {
				copied = document.execCommand( 'copy' );
			} catch ( e ) {
				copied = false;
			}

			// Show a success or failure message.
			if ( copied ) {
				mw.notify( this.successMessage );
				this.$emit( 'copy' );
			} else {
				mw.notify( this.failMessage, { type: 'error' } );
			}

			// Remove the textarea element.
			document.body.removeChild( textarea );
		}
	}

};
</script>
