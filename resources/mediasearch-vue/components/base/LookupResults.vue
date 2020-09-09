<template>
	<div class="wbmi-lookup-results">
		<ul
			:id="listboxId"
			class="wbmi-lookup-results__list"
			role="listbox"
			:aria-labelledby="labelledBy"
		>
			<li
				v-for="( result, index ) in lookupResults"
				:id="'wbmi-lookup-result__list-item--' + result"
				:key="'wbmi-lookup-result__list-item--' + result"
				class="wbmi-lookup-results__list-item"
				:class="{ 'wbmi-lookup-results__list-item--active': isActiveItem( result ) }"
				role="option"
				:aria-selected="isActiveItem( result )"
				@mousedown="$emit( 'select', result )"
				@mouseover="$emit( 'active-item-change', index )"
				@mouseleave="$emit( 'active-item-change', -1 )"
			>
				{{ result }}
			</li>
		</ul>
	</div>
</template>

<script>
/**
 * @file LookupResults
 *
 * List of lookup results that informs the parent component when a list item is
 * clicked. Receives the index of the active item from parent so a visual
 * indication can be applied via CSS here.
 *
 * On hover, active item index is emitted to the parent. On mouse leave, the
 * index is reset to -1 (i.e. no active active).
 */
// @vue/component
module.exports = {
	name: 'WbmiLookupResults',

	props: {
		lookupResults: {
			type: Array,
			default: function () {
				return [];
			}
		},

		activeLookupItemIndex: {
			type: [ Number, String ],
			default: 0
		},

		listboxId: {
			type: String,
			required: true
		},

		labelledBy: {
			type: String,
			required: true
		}
	},

	methods: {
		/**
		 * Determine if a list item should have the active class.
		 *
		 * @param {string} result
		 * @return {boolean}
		 */
		isActiveItem: function ( result ) {
			return result === this.lookupResults[ this.activeLookupItemIndex ];
		}
	}
};
</script>
