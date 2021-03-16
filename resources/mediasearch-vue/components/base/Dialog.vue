<template>
	<div class="wbmi-dialog-wrapper">
		<transition name="wbmi-scale" appear>
			<div
				v-if="active"
				class="wbmi-dialog"
				:class="rootClasses"
				role="dialog"
				aria-fullscreen="true"
				@keyup="onKeyup"
			>
				<div class="wbmi-dialog__overlay" @click="close"></div>
				<div ref="landing" tabindex="0"></div>
				<div class="wbmi-dialog__shell">
					<div v-if="!headless" class="wbmi-dialog__header">
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

						<wbmi-button
							v-if="isMobileSkin && progressiveAction"
							class="wbmi-dialog__header-action--progressive"
							:primary="true"
							:progressive="true"
							:disabled="progressiveActionDisabled"
							@click="progress"
						>
							{{ progressiveAction }}
						</wbmi-button>
					</div>

					<div
						class="wbmi-dialog__body"
						:class="bodyClasses"
						tabindex="-1"
					>
						<div class="wbmi-dialog__body__content">
							<slot></slot>
						</div>
					</div>

					<div class="wbmi-dialog__footer">
						<wbmi-button
							v-if="!isMobileSkin && progressiveAction"
							class="wbmi-dialog__footer-action--progressive"
							:primary="true"
							:progressive="true"
							:disabled="progressiveActionDisabled"
							@click="progress"
						>
							{{ progressiveAction }}
						</wbmi-button>
					</div>
				</div>
			</div>
		</transition>
	</div>
</template>

<script>
var WbmiButton = require( './Button.vue' ),
	closeIcon = require( '../../../../lib/icons.js' ).wbmiIconClose;

/**
 * Dialog component.
 *
 * This component will append its element to the end of the <body> on mount.
 * When the active prop is true, the dialog will display, with CSS transitions
 * during open and close. See prop documentation for more details.
 *
 * Known shortcomings:
 * - We have not yet handled the use of components that have overlays inside
 *   this dialog, so you may find that things like select list menus get cut off
 *   due to CSS overflow rules.
 * - Whether the dialog is fullscreen is determined based on the skin (it will
 *   be fullscreen if the skin is Minerva Neue), you can't control this via a
 *   prop
 * - Dialog min-height should be set via CSS to something natural-looking. In
 *   the future, we should handle this within the dialog component to size the
 *   height according to the body content height and the viewport size.
 * - The dialog can display a progressive action, but handling a destructive
 *   action has not yet been implemented.
 */
// @vue/component
module.exports = {
	name: 'WbmiDialog',

	components: {
		'wbmi-button': WbmiButton
	},

	props: {
		/**
		 * Whether the dialog is visible.
		 */
		active: {
			type: Boolean
		},

		/**
		 * Title to appear in the dialog header.
		 */
		title: {
			// String or mw.msg object.
			type: [ String, Object ],
			default: null
		},

		/**
		 * Label for the progressive action.
		 */
		progressiveAction: {
			// String or mw.msg object.
			type: [ String, Object ],
			default: ''
		},

		/**
		 * Whether to disable the progresive action button
		 */
		progressiveActionDisabled: {
			type: Boolean
		},

		/**
		 * Set to true to remove the header (and, therefore, the built-in close
		 * button).
		 */
		headless: {
			type: Boolean
		}
	},

	data: function () {
		return {
			closeIcon: closeIcon,
			fullscreen: mw.config.get( 'skin' ) === 'minerva'
		};
	},

	computed: {
		/**
		 * @return {Object}
		 */
		rootClasses: function () {
			return {
				'wbmi-dialog--fullscreen': this.fullscreen
			};
		},

		/**
		 * @return {Object}
		 */
		bodyClasses: function () {
			return {
				'wbmi-dialog__body--headless': this.headless
			};
		},

		/**
		 * @return {boolean}
		 */
		isMobileSkin: function () {
			return mw.config.get( 'skin' ) === 'minerva';
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
		 * @fires progress
		 */
		progress: function () {
			this.$emit( 'progress' );
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

	watch: {
		active: function ( newVal ) {
			if ( newVal === true ) {
				// Add a class to the body so we can hide overflow, preventing
				// confusing scrolling behavior.
				document.body.classList.add( 'wbmi-body--open-dialog' );

				// Move focus to the dialog element.
				this.$nextTick( function () {
					this.$refs.landing.focus();
				} );
			} else {
				document.body.classList.remove( 'wbmi-body--open-dialog' );
			}
		}
	},

	mounted: function () {
		// Add this component to the end of the body element.
		document.body.append( this.$el );
	},

	beforeDestroy: function () {
		// Remove lingering body class and the element itself.
		document.body.classList.remove( 'wbmi-body--open-dialog' );
		document.body.removeChild( this.$el );
	}
};
</script>
