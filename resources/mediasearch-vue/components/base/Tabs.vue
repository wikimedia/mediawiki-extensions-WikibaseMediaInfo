<template>
	<div class="wbmi-tabs">
		<div class="wbmi-tabs__header" :class="headerClasses">
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
				<div v-for="( tab, index ) in tabs"
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
					<observer
						v-if="isLastTab( index ) && supportsObserver"
						@intersect="removeGradientClass"
						@hide="addGradientClass"
					></observer>
				</div>
			</div>
		</div>

		<div class="wbmi-tabs__content">
			<slot></slot>
		</div>
	</div>
</template>

<script>
var Vue = require( 'vue' ), // Vue is imported here for type definition
	Observer = require( './Observer.vue' );

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

	components: {
		observer: Observer
	},

	props: {
		active: {
			type: String,
			default: null
		}
	},

	data: function () {
		return {
			tabs: {},
			currentTabName: null,
			hasGradient: false
		};
	},

	computed: {
		headerClasses: function () {
			return {
				'wbmi-tabs__header--gradient': this.hasGradient
			};
		},

		currentTabId: function () {
			return this.tabs[ this.currentTabName ] ?
				this.tabs[ this.currentTabName ].id + '-label' :
				false;
		},

		supportsObserver: function () {
			return 'IntersectionObserver' in window &&
				'IntersectionObserverEntry' in window &&
				'intersectionRatio' in window.IntersectionObserverEntry.prototype;
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
		},

		/**
		 * @param {string} mediaType bitmap, audio, video, etc.
		 * @return {boolean}
		 */
		isLastTab: function ( mediaType ) {
			var tabKeys = Object.keys( this.tabs );
			return mediaType === tabKeys[ tabKeys.length - 1 ];
		},

		/**
		 * When final tab is out of view, add class that will add a gradient to
		 * indicate to the user that they can horizontally scroll.
		 */
		addGradientClass: function () {
			this.hasGradient = true;
		},

		/**
		 * When final tab is in view, don't show the gradient.
		 */
		removeGradientClass: function () {
			this.hasGradient = false;
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
