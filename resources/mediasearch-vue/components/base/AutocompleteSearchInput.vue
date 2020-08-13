<template>
	<div class="wbmi-input" :class="rootClasses">
		<div class="wbmi-input__wrapper">
			<label
				:id="labelElementId"
				:for="inputElementId"
				class="wbmi-input__label"
			>
				{{ label }}
			</label>

			<input
				:id="inputElementId"
				ref="input"
				v-model="value"
				dir="auto"
				class="wbmi-input__input"
				type="text"
				role="combobox"
				aria-autocomplete="list"
				:aria-owns="lookupResultsElementId"
				:aria-expanded="isExpanded"
				:aria-activedescendant="activeLookupItemId"
				:placeholder="placeholder"
				@input="onInput"
				@focus="onFocus"
				@blur="onBlur"
				@keyup.enter="onSubmit"
				@keyup.up="onArrowUp"
				@keyup.down="onArrowDown"
			>

			<span class="wbmi-input__icon" @click="onIconClick">
				<wbmi-icon :icon="icons.wbmiIconSearch"></wbmi-icon>
			</span>

			<span
				v-if="value"
				class="wbmi-input__indicator"
				role="button"
				@click="onClear"
			>
				<wbmi-icon :icon="icons.wbmiIconClear" :title="clearTitle"></wbmi-icon>
			</span>

			<wbmi-select-menu
				v-if="hasLookupResults && showLookupResults"
				:items="lookupResults"
				:active-item-index="activeLookupItemIndex"
				:listbox-id="lookupResultsElementId"
				:labelled-by="labelElementId"
				@select="onLookupItemSelect"
				@active-item-change="onActiveItemChange"
			>
			</wbmi-select-menu>
		</div>

		<wbmi-button
			v-if="hasButton"
			class="wbmi-input__button"
			:primary="true"
			:progressive="true"
			@click="onSubmit"
		>
			{{ $i18n( 'searchbutton' ) }}
		</wbmi-button>
	</div>
</template>

<script>
var WbmiButton = require( './Button.vue' ),
	WbmiIcon = require( './Icon.vue' ),
	WbmiSelectMenu = require( './SelectMenu.vue' ),
	icons = require( '../../../../lib/icons.js' );

/**
 * @file AutocompleteSearchInput
 *
 * Search input that emits user-provided input to the parent, then receives and
 * displays autocomplete results. This component is fairly specific to the Media
 * Search use case: we know we'll be fetching autocomplete results, we'll always
 * have a search icon and clear indicator button, etc. This could be made more
 * general for wider usage.
 */
// @vue/component
module.exports = {
	name: 'WbmiAutocompleteSearchInput',

	components: {
		'wbmi-button': WbmiButton,
		'wbmi-icon': WbmiIcon,
		'wbmi-select-menu': WbmiSelectMenu
	},

	props: {
		/**
		 * Name must be provided to ensure unique aria attributes. This probably
		 * isn't the best way to do it in WVUI but serves our purposes here.
		 */
		name: {
			type: String,
			required: true
		},

		/**
		 * Required label for input. Currently, label will always be visually
		 * hidden, but this could be toggled via a prop in a future iteration.
		 */
		label: {
			type: [ String, Object ],
			required: true
		},

		initialValue: {
			type: [ String, Number ],
			default: ''
		},

		placeholder: {
			type: [ String, Object ],
			default: null
		},

		clearTitle: {
			type: [ String, Object ],
			default: null
		},

		buttonLabel: {
			type: [ String, Object ],
			default: null
		},

		lookupResults: {
			type: Array,
			default: function () {
				return [];
			}
		}
	},

	data: function () {
		return {
			value: this.initialValue,
			icons: icons,
			pending: false,
			showLookupResults: false,
			activeLookupItemIndex: -1
		};
	},

	computed: {
		/**
		 * @return {Object}
		 */
		rootClasses: function () {
			return {
				'wbmi-input--button': this.hasButton,
				'wbmi-input--pending': this.pending
			};
		},

		/**
		 * @return {boolean}
		 */
		hasButton: function () {
			return !!this.buttonLabel;
		},

		/**
		 * @return {boolean}
		 */
		hasLookupResults: function () {
			return this.lookupResults.length > 0;
		},

		/**
		 * ID of the visually-hidden label.
		 *
		 * @return {string}
		 */
		labelElementId: function () {
			return this.name + '__label';
		},

		/**
		 * ID of the input.
		 *
		 * @return {string}
		 */
		inputElementId: function () {
			return this.name + '__input';
		},

		/**
		 * ID of the lookup results container.
		 *
		 * @return {string}
		 */
		lookupResultsElementId: function () {
			return this.name + '__lookup-results';
		},

		/**
		 * The actual string of the active lookup result item.
		 *
		 * @return {string}
		 */
		activeLookupItem: function () {
			if ( this.lookupResults.length < 1 ||
				!this.showLookupResults ||
				this.activeLookupItemIndex < 0
			) {
				return false;
			}

			return this.lookupResults[ this.activeLookupItemIndex ];
		},

		/**
		 * The ID of the element of the active lookup result item.
		 *
		 * @return {string|boolean}
		 */
		activeLookupItemId: function () {
			return this.activeLookupItemIndex > -1 ?
				this.lookupResultsElementId + '-item-' + this.activeLookupItemIndex :
				false;
		},

		/**
		 * For the aria-expanded attribute of the input, we need to use strings
		 * instead of booleans so that aria-expanded will be set to "false" when
		 * appropriate rather than the attribute being omitted, which is what
		 * would happen if we used a boolean false.
		 *
		 * @return {string}
		 */
		isExpanded: function () {
			return this.hasLookupResults && this.showLookupResults ? 'true' : 'false';
		}
	},

	methods: {
		/**
		 * Emit input and enable pending state.
		 *
		 * @fires input
		 */
		onInput: function () {
			this.pending = true;
			this.$emit( 'input', this.value );
		},

		/**
		 * If there are existing lookup results, show them on focus.
		 *
		 * @param {Event} event
		 * @fires focus
		 */
		onFocus: function ( event ) {
			this.toggleLookupResults( this.lookupResults.length > 0 );
			this.$emit( 'focus', event );
		},

		/**
		 * Hide, but don't delete, lookup results.
		 *
		 * @param {Event} event
		 * @fires blur
		 */
		onBlur: function ( event ) {
			this.$emit( 'blur', event );
			this.toggleLookupResults( false );
		},

		/**
		 * Handle enter keypress or button click.
		 *
		 * @fires enter
		 */
		onSubmit: function () {
			// If the user is highlighting an autocomplete result, emit that
			// result. Otherwise, emit the value of the text input.
			if ( this.hasLookupResults && this.activeLookupItemIndex >= 0 ) {
				// We also want to update the input text.
				this.value = this.activeLookupItem;
			}
			this.$emit( 'submit', this.value );
			this.clearLookupResults();
		},

		/**
		 * Handle lookup item click.
		 *
		 * @param {number} index
		 * @fires submit
		 */
		onLookupItemSelect: function ( index ) {
			this.value = this.lookupResults[ index ];
			this.$emit( 'submit', this.value );
			this.clearLookupResults();
		},

		/**
		 * Move to the next lookup result. If we're at the end, go back to the
		 * first item.
		 */
		onArrowDown: function () {
			var index = this.activeLookupItemIndex;
			if ( this.hasLookupResults ) {
				this.activeLookupItemIndex = this.lookupResults.length > index + 1 ?
					index + 1 :
					0;
			}
		},

		/**
		 * Move to the previous lookup result. If we're at the beginning, go to
		 * the last item.
		 */
		onArrowUp: function () {
			var index = this.activeLookupItemIndex;
			if ( this.hasLookupResults && index > -1 ) {
				this.activeLookupItemIndex = index === 0 ?
					this.lookupResults.length - 1 :
					index - 1;
			}
		},

		/**
		 * Change the active item index based on mouseover or mouseleave.
		 *
		 * @param {number} index
		 */
		onActiveItemChange: function ( index ) {
			this.activeLookupItemIndex = index;
		},

		/*
		* Set focus to input if icon is clicked.
		*/
		onIconClick: function () {
			var $input;

			this.$nextTick( function () {
				$input = this.$refs.input;
				$input.focus();
			} );
		},

		/**
		 * Handle clear icon click.
		 */
		onClear: function () {
			this.$emit( 'clear' );
			this.value = '';
			this.clearLookupResults();
		},

		/**
		 * Helper function to reset lookup results to an empty array.
		 */
		clearLookupResults: function () {
			this.$emit( 'clear-lookup-results' );
		},

		/**
		 * Show or hide lookup results.
		 *
		 * @param {boolean} show
		 */
		toggleLookupResults: function ( show ) {
			this.showLookupResults = show;
		}
	},

	watch: {
		/**
		 * When new lookup results are received, remove pending state and reset
		 * the active item index.
		 */
		lookupResults: function () {
			this.pending = false;
			this.activeLookupItemIndex = -1;
			this.toggleLookupResults( this.lookupResults.length > 0 );
		}
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import './../../../mediainfo-variables.less';

.wbmi-input {
	box-sizing: border-box;
	vertical-align: middle;

	&__wrapper {
		// Input wrapper should grow to fit the container.
		.flex( 1, 1, auto, 0 );
		// For proper positioning of icon, indicator, and lookup results.
		position: relative;
	}

	&__label {
		.wbmi-visually-hidden();
	}

	// Icon and indicator should be absolutely positioned and vertically
	// centered.
	&__icon,
	&__indicator {
		line-height: 1;
		padding-left: @wbmi-padding-horizontal-input-text;
		position: absolute;
		top: 50%;
		transform: translateY( -50% );
	}

	&__icon {
		padding-left: @wbmi-padding-horizontal-input-text;
	}

	&__indicator {
		color: @wbmi-indicator-color;
		cursor: pointer;
		padding-right: @wbmi-padding-horizontal-input-text;
		right: 0;

		.wbmi-icon {
			// Icon size is based on font size, so we'll set it here to make the
			// indicator smaller than the default font size.
			// Equal to 12px in ems.
			font-size: unit( @min-size-indicator / @wbmi-font-size-browser / @wbmi-font-size-base, em );
		}
	}

	&__input {
		.box-shadow( inset 0 0 0 1px transparent );
		background-color: @background-color-base;
		border: @border-width-base @border-style-base @border-color-base;
		border-radius: @border-radius-base;
		box-sizing: border-box;
		color: @color-base--emphasized;
		display: block;
		font-size: inherit;
		height: @wbmi-size-base;
		line-height: @wbmi-line-height-base;
		margin: 0;
		padding: @wbmi-padding-input-text;
		width: 100%;

		&::placeholder {
			color: @color-placeholder;
			opacity: 1;
		}

		// Non standard pseudo-element
		// Support: Internet Explorer 10, Internet Explorer 11, and Microsoft Edge.
		// For details see https://developer.mozilla.org/en-US/docs/Web/CSS/::-ms-clear
		&::-ms-clear {
			display: none;
		}

		&:focus {
			.box-shadow( @box-shadow-base--focus );
			border-color: @wmui-color-accent50;
			outline: 0;
		}

		&[ type='search' ] {
			// Support: Safari, Chrome (Blink).
			&::-webkit-search-decoration,
			&::-webkit-search-cancel-button {
				display: none;
			}
		}
	}

	// Apply pending state mixin, which generates a moving striped background,
	// while autocomplete results are fetched.
	&--pending .wbmi-input__input {
		.wbmi-pending-state();
	}

	&--button {
		display: flex;

		// Remove the border radii between the input and the button.
		> .wbmi-input__wrapper .wbmi-input__input {
			flex: 1;
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		}

		.wbmi-input__button {
			border-top-left-radius: 0;
			border-bottom-left-radius: 0;
			border-left-width: 0;
			height: @wbmi-size-base;
			line-height: @wbmi-line-height-base;
			margin: 0; // Undo Safari style.
		}
	}

	&:hover {
		&__input {
			border-color: @wbmi-border-color-input--hover;
		}
	}
}
</style>
