<template>
	<div class="wbmi-tabs">
		<div class="wbmi-tabs__header">
			<div
				class="wbmi-tabs__tabs-list"
				role="tablist"
				tabindex="0"
				:aria-activedescendant="currentTabId"
				@keydown.left="moveBack"
				@keydown.up.prevent="moveBack"
				@keydown.right="moveForward"
				@keydown.down.prevent="moveForward"
			>
				<div v-for="tab in tabs"
					:id="tab.id + '-label'"
					:key="tab.title"
					:class="determineTabLabelClasses( tab )"
					:aria-selected="tab.name === currentTabName"
					:aria-controls="tab.id"
					class="wbmi-tabs__tabs-list__item"
					role="tab"
					@click="selectTab( tab.name )"
					@keyup.enter="selectTab( tab.name )"
				>
					{{ tab.title }}
				</div>
			</div>

			<div class="wbmi-tabs__filters">
				<slot name="filters"></slot>
			</div>
		</div>

		<div class="wbmi-tabs__content">
			<slot></slot>
		</div>
	</div>
</template>

<script>
var Vue = require( 'vue' ); // Vue is imported here for type definition

/**
 * A group of tabs with a tab menu.
 *
 * Tab can be changed via user click on a tab menu item or by changing the
 * active prop passed to the Tabs component.
 *
 * This component has two slots: the main slot, which is meant to contain Tab
 * components, and the filters slot, which can contain Select components that
 * will be displayed inline with the tabs list in the heading.
 */
// @vue/component
module.exports = {
	name: 'WbmiTabs',

	props: {
		active: {
			type: String,
			default: null
		}
	},

	data: function () {
		return {
			tabs: {},
			currentTabName: null
		};
	},

	computed: {
		currentTabId: function () {
			return this.tabs[ this.currentTabName ] ?
				this.tabs[ this.currentTabName ].id + '-label' :
				false;
		}
	},

	methods: {
		/**
		 * Change the current tab.
		 *
		 * @param {string} tabName
		 */
		selectTab: function ( tabName ) {
			if ( this.tabs[ tabName ].disabled === true ) {
				return;
			}

			this.currentTabName = tabName;
		},

		/**
		 * Set active attribute on each tab.
		 *
		 * @param {string} currentTabName
		 */
		setTabState: function ( currentTabName ) {
			var tabName;
			for ( tabName in this.tabs ) {
				this.tabs[ tabName ].isActive = ( tabName === currentTabName );
			}
		},

		/**
		 * Set tab label classes.
		 *
		 * @param {Vue.component} tab
		 * @return {Object}
		 */
		determineTabLabelClasses: function ( tab ) {
			return {
				'is-active': tab.name === this.currentTabName,
				'is-disabled': tab.disabled
			};
		},

		/**
		 * Left or up arrow keydown should move to previous tab, if one exists.
		 */
		moveBack: function () {
			var tabNames = Object.keys( this.tabs ),
				previousTabIndex = tabNames.indexOf( this.currentTabName ) - 1;

			if ( previousTabIndex < 0 ) {
				// There is no previous tab, do nothing.
				return;
			}

			this.selectTab( Object.keys( this.tabs )[ previousTabIndex ] );
		},

		/**
		 * Right or down arrow keydown should move to next tab, if one exists.
		 */
		moveForward: function () {
			var tabNames = Object.keys( this.tabs ),
				nextTabIndex = tabNames.indexOf( this.currentTabName ) + 1;

			if ( nextTabIndex >= tabNames.length ) {
				// There is no next tab, do nothing.
				return;
			}

			this.selectTab( tabNames[ nextTabIndex ] );
		},

		/**
		 * Create an object with tabs keyed by their names, then set the
		 * isActive attribute for each tab.
		 */
		initializeTabs: function () {
			var tabs = this.$slots.default;
			this.tabs = {};

			tabs.forEach( function ( tab ) {
				this.tabs[ tab.componentInstance.name ] = tab.componentInstance;
			}.bind( this ) );

			// If no active tab was passed in as a prop, default to first one.
			this.currentTabName = this.active ? this.active : Object.keys( this.tabs )[ 0 ];
			this.setTabState( this.currentTabName );
		}
	},

	watch: {
		/**
		 * When the tab stored in state changes, select that tab.
		 *
		 * @param {string} newTabName
		 */
		active: function ( newTabName ) {
			this.selectTab( newTabName );
		},

		/**
		 * When the current tab changes, set active states and emit an event.
		 *
		 * @param {string} newTabName
		 */
		currentTabName: function () {
			this.setTabState( this.currentTabName );

			// Don't emit an event if the currentTabName changed as a result of
			// the active prop changing. In that case, the parent already knows.
			if ( this.currentTabName !== this.active ) {
				this.$emit( 'tab-change', this.tabs[ this.currentTabName ] );
			}
		}
	},

	mounted: function () {
		this.initializeTabs();
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import './../../../mediainfo-variables.less';

/* stylelint-disable selector-class-pattern */
/* stylelint-disable no-descending-specificity */
.wbmi-tabs {
	&__header {
		.box-shadow( inset 0 -1px 0 0 @border-color-base );
		.flex-display();
		align-items: flex-end;
		justify-content: space-between;
	}

	&__tabs-list {
		.flex-display();

		&:focus {
			outline: 0;

			.wbmi-tabs__tabs-list__item.is-active {
				border-radius: 2px;
				box-shadow: inset 0 0 0 2px @color-primary;
			}
		}

		&__item {
			color: @color-base--subtle;
			cursor: pointer;
			font-weight: bold;
			margin: @wbmi-padding-vertical-base @wbmi-padding-vertical-base 0 0;
			padding: @wbmi-padding-vertical-base @wbmi-padding-horizontal-base;
			transition: color 100ms, box-shadow 100ms;

			&:hover,
			&.is-active {
				color: @color-primary;
				.box-shadow( inset 0 -2px 0 0 @color-primary );
			}

			&:hover {
				color: @color-primary--hover;
				.box-shadow( inset 0 -2px 0 0 @color-primary--hover );
			}

			&.is-disabled {
				color: @color-base--disabled;
				cursor: not-allowed;

				&:hover,
				&.is-active {
					color: @color-base--disabled;
					box-shadow: unset;
				}
			}
		}
	}

	&__filters {
		.flex-display();

		// Note: this code is currently specific to the Tabs component but could
		// be useful elsewhere in the future. If that's the case, we might want
		// to add an alternate style ("frameless"?) to the Select component.
		.wbmi-select {
			margin: @wbmi-padding-vertical-base @wbmi-padding-vertical-base 0 0;

			&:last-child {
				margin-right: 0;
			}

			// Styles for when a filter value has been selected.
			&--value-selected {
				.wbmi-select__content {
					.box-shadow( inset 0 -2px 0 0 @color-primary );
					color: @color-primary;

					.wbmi-select__handle {
						color: @color-primary;
					}
				}
			}

			&__content {
				background-color: transparent;
				border: 0;
				border-radius: 0;
				font-weight: bold;

				&:hover,
				&:focus {
					.box-shadow( inset 0 -2px 0 0 @color-primary--hover );
					border-color: transparent;
					color: @color-primary--hover;
					outline: 0;

					.wbmi-select__handle {
						color: @color-primary--hover;
					}
				}
			}
		}

		// Align the select menu to the right.
		.wbmi-select-menu {
			left: auto;
			right: 0;
		}
	}
}
</style>
