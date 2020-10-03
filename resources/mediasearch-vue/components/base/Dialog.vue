<template>
	<transition name="wbmi-scale" appear>
		<div
			class="wbmi-dialog"
			:class="rootClasses"
			tabindex="0"
			role="dialog"
			aria-fullscreen="true"
			@keyup="onKeyup"
		>
			<div class="wbmi-dialog__overlay" @click="close"></div>

			<div class="wbmi-dialog__shell">
				<div v-if="!noHeader" class="wbmi-dialog__header">
					<div v-if="title" class="wbmi-dialog__header-title">
						{{ title }}
					</div>
					<wbmi-button
						class="wbmi-dialog__header-action--safe"
						:invisible-text="true"
						:frameless="true"
						:icon="closeIcon"
						@click="close"
					></wbmi-button>
				</div>

				<div class="wbmi-dialog__body">
					<slot></slot>
				</div>

				<div class="wbmi-dialog__footer">
					<slot name="footer"></slot>
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
var WbmiButton = require( './Button.vue' ),
	closeIcon = require( '../../../../lib/icons.js' ).wbmiIconClose;

/**
 * Dialog component.
 *
 * The existence (and, therefore, visibility) of this dialog is handled in the
 * parent. A 'close' event is emitted when the close button is clicked or the
 * esc key is pressed.
 *
 * TODO:
 * - Add slot for a progressive action button in the header
 * - Push the limits of dialog content (header, body, and footer) to test
 *   text formatting and layout
 */
// @vue/component
module.exports = {
	name: 'WbmiDialog',

	components: {
		'wbmi-button': WbmiButton
	},

	props: {
		/**
		 * Title to appear in the dialog header.
		 */
		title: {
			// String or mw.msg object.
			type: [ String, Object ],
			default: null
		},

		/**
		 * Set to true to remove the header (and, therefore, the built-in close
		 * button).
		 */
		noHeader: {
			type: Boolean
		},

		/**
		 * Set to true to make the dialog take over the full screen.
		 */
		fullscreen: {
			type: Boolean
		}
	},

	data: function () {
		return {
			closeIcon: closeIcon
		};
	},

	computed: {
		rootClasses: function () {
			return {
				'wbmi-dialog--fullscreen': this.fullscreen
			};
		}
	},

	methods: {
		/**
		 * @fires close
		 */
		close: function () {
			this.$emit( 'close' );
		},

		/**
		 * @param {KeyboardEvent} e
		 * @fires close|key
		 */
		onKeyup: function ( e ) {
			if ( e.code === 'Escape' ) {
				this.$emit( 'close' );
			} else {
				this.$emit( 'key', e.code );
			}
		}
	},

	mounted: function () {
		// Add a class to the body element so we can hide overflow, preventing
		// confusing scroll behavior.
		document.body.classList.add( 'wbmi-body--open-dialog' );

		// Set focus to dialog.
		this.$nextTick( function () {
			this.$el.focus();
		} );
	},

	beforeDestroy: function () {
		document.body.classList.remove( 'wbmi-body--open-dialog' );
	}
};
</script>
