<template>
	<button
		class="mw-button"
		:class="builtInClasses"
		:disabled="disabled"
		@click="$emit( 'click' )"
	>
		<icon
			v-if="icon"
			:icon="icon"
			:invert="invert"
		></icon>
		<div class="mw-button__content">
			<slot></slot>
		</div>
	</button>
</template>

<script>
var Icon = require( './Icon.vue' );

/**
 * Button with optional icon.
 *
 * See ImageCard.vue for usage examples.
 */
// @vue/component
module.exports = {
	name: 'MWButton',

	components: {
		icon: Icon
	},

	props: {
		disabled: {
			type: Boolean
		},

		frameless: {
			type: Boolean
		},

		icon: {
			type: String,
			default: null
		},

		// Set to true to hide text node.
		invisibletext: {
			type: Boolean
		},

		// In OOUI, flags are passed in as an array (or a string or an object)
		// and are handled by a separate mixin. Passing them in individually is
		// a bit more readable and intuitive, plus it makes the code in this
		// component simpler.
		progressive: {
			type: Boolean
		},

		destructive: {
			type: Boolean
		},

		primary: {
			type: Boolean
		}
	},

	computed: {
		builtInClasses: function () {
			return {
				'mw-button--framed': !this.frameless,
				'mw-button--icon': this.icon,
				'mw-button--invisible-text': this.invisibletext,
				'mw-button--progressive': this.progressive,
				'mw-button--destructive': this.destructive,
				'mw-button--primary': this.primary
			};
		},

		invert: function () {
			return ( this.primary || this.disabled ) && !this.frameless;
		}
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../../../lib/wikimedia-ui-base.less';

/* stylelint-disable selector-class-pattern */

.mw-button {
	.transition( ~'background-color 100ms, color 100ms, border-color 100ms, box-shadow 100ms' );
	background-color: transparent;
	border: @border-width-base @border-style-base transparent;
	border-radius: 2px;
	color: @color-base;
	cursor: pointer;
	font-size: inherit;
	font-weight: bold;
	padding: 6px;
	user-select: none;

	&:hover {
		background-color: rgba( 0, 24, 73, 7/255 );
		color: @color-base--emphasized;
	}

	&:focus {
		border-color: @color-primary;
		box-shadow: @box-shadow-base--focus;
		outline: 0;
	}

	.mw-icon {
		height: 100%;
		left: 5/14em;
		position: absolute;
		top: 0;
		transition: opacity 100ms;

		&:not( .oo-ui-icon-invert ) {
			opacity: @opacity-icon-base;
		}
	}

	// Variants.
	&--icon {
		padding-left: 30/14em;
		position: relative;
	}

	&--framed {
		background-color: @background-color-framed;
		border-color: @border-color-base;
		padding: 6px 12px;

		&:hover {
			background-color: @background-color-framed--hover;
			color: @color-base--hover;
		}

		&.mw-button--icon {
			padding-left: 38/14em;
			position: relative;
		}

		/* stylelint-disable-next-line no-descending-specificity */
		.mw-icon {
			left: 11/14em;
		}
	}

	&--progressive {
		color: @color-primary;

		&:hover {
			color: @color-primary--hover;
		}

		&.mw-button--framed {
			&:hover {
				border-color: @color-primary--hover;
			}
		}
	}

	&--destructive {
		color: @color-destructive;

		&:hover {
			color: @color-destructive--hover;
		}

		&:focus {
			border-color: @color-destructive;
			box-shadow: inset 0 0 0 1px @color-destructive;
		}

		&.mw-button--framed {
			&:hover {
				border-color: @color-destructive--hover;
			}

			&:focus {
				box-shadow: inset 0 0 0 1px @color-destructive
					inset 0 0 0 2px @color-base--inverted;
			}
		}
	}

	&--primary {
		&.mw-button--framed {
			// Default to progressive.
			background-color: @color-primary;
			border-color: @color-primary;
			color: @color-base--inverted;

			&:hover {
				background-color: @color-primary--hover;
				border-color: @color-primary--hover;
			}

			&:focus {
				box-shadow: @box-shadow-primary--focus;
			}

			&.mw-button--destructive {
				background-color: @color-destructive;
				border-color: @color-destructive;

				&:hover {
					background-color: @color-destructive--hover;
					border-color: @color-destructive--hover;
				}

				&:focus {
					box-shadow: inset 0 0 0 1px @color-destructive
						inset 0 0 0 2px @color-base--inverted;
				}
			}
		}
	}

	&:disabled {
		color: @color-base--disabled;
		cursor: auto;

		&:hover,
		&:focus {
			background-color: @background-color-base;
		}

		&.mw-button--framed {
			background-color: @background-color-filled--disabled;
			border-color: @border-color-base--disabled;
			color: @color-base--inverted;

			&:hover,
			&:focus {
				background-color: @background-color-filled--disabled;
				border-color: @border-color-base--disabled;
				box-shadow: none;
			}
		}

		&:not( .mw-button--framed ) .mw-icon {
			opacity: @opacity-base--disabled;
		}
	}

	&--invisible-text {
		padding-right: 0;

		.mw-button__content {
			border: 0;
			clip: rect( 1px, 1px, 1px, 1px );
			display: block;
			height: 1px;
			margin: -1px;
			overflow: hidden;
			padding: 0;
			position: absolute;
			width: 1px;
		}
	}
}
</style>
