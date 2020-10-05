<template>
	<div class="wbmi-concept-chips">
		<wbmi-button
			v-for="concept in concepts"
			:key="concept"
			class="wbmi-concept-chips__button"
			@click="$emit( 'concept-select', concept )"
		>
			{{ concept }}
		</wbmi-button>
	</div>
</template>

<script>
/**
 * @file ConceptChips.vue
 *
 * Set of buttons representing concept chips for a given search term. On click,
 * the concept chip label is emitted to the parent App component so it can
 * update the search term in state and perform a new search.
 */
var WbmiButton = require( './base/Button.vue' );

// @vue/component
module.exports = {
	name: 'ConceptChips',

	components: {
		'wbmi-button': WbmiButton
	},

	props: {
		mediaType: {
			type: String,
			required: true
		},

		concepts: {
			type: Array,
			required: true
		}
	}
};
</script>
