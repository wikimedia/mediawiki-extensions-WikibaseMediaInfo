<template>
	<div class="wbmi-media-search-input">
		<div class="wbmi-media-search-input__input-wrapper">
			<input
				v-model="term"
				:placeholder="$i18n( 'searchbutton' )"
				class="wbmi-media-search-input__input"
				tabindex="0"
				aria-disabled="false"
				@keyup.enter="updateTerm"
			>

			<span class="wbmi-media-search-input__input-icon">
				<mw-icon
					:icon="'search'"
				></mw-icon>
			</span>

			<mw-indicator
				v-if="showIndicator"
				class="wbmi-media-search-input__input-clear"
				:icon="'close'"
				@click="clearInput"
			></mw-indicator>
		</div>

		<mw-button
			class="wbmi-media-search-input__button"
			:primary="true"
			:progressive="true"
			@click="updateTerm">
			{{ $i18n( 'searchbutton' ) }}
		</mw-button>
	</div>
</template>

<script>
var Button = require( './base/Button.vue' ),
	Icon = require( './base/Icon.vue' ),
	Indicator = require( './base/Indicator.vue' );

module.exports = {
	name: 'SearchInput',

	components: {
		'mw-button': Button,
		'mw-icon': Icon,
		'mw-indicator': Indicator
	},

	props: {
		initialTerm: String
	},

	data: function () {
		return {
			term: this.initialTerm
		};
	},

	computed: {
		showIndicator: function () {
			if ( this.term && this.term.length >= 1 ) {
				return true;
			} else {
				return false;
			}
		}
	},

	methods: {
		updateTerm: function () {
			this.$emit( 'update', this.term );
		},

		clearInput: function () {
			this.term = '';
			this.$emit( 'clear' );
		}
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../../lib/wikimedia-ui-base.less';

.wbmi-media-search-input {
	.flex-display();
	.flex-wrap( nowrap );
	box-sizing: border-box;
	max-width: @max-width-base;
	padding: 0 0 16px 0;
	width: 100%;

	&__input-wrapper {
		align-self: stretch;
		position: relative;
		width: 100%;
	}

	&__input {
		border-radius: @border-radius-base 0 0 @border-radius-base;
		border: @border-style-base @border-width-base @border-color-base;
		box-sizing: border-box;
		font-size: 14px;
		height: 100%;
		margin: 0;
		padding-left: 36px;
		width: 100%;

		&:focus {
			border-color: @color-primary--focus;
			box-shadow: @box-shadow-base--focus;
			outline: 0;
		}

		&::placeholder {
			color: @color-placeholder;
		}
	}

	&__input-icon {
		.flex-display();
		flex-direction: column;
		height: 100%;
		justify-content: center;
		left: 8px;
		position: absolute;
		top: 0;
	}

	&__input-clear {
		position: absolute;
		top: 0;
		right: 0;
	}

	&__button {
		border-radius: 0 @border-radius-base @border-radius-base 0;
		margin: 0;
	}
}
</style>
