<template>
	<div>
		<ul>
			<li v-for="(result, index) in results" v-bind:key="index">
				{{ result.title }}
			</li>

			<observer v-on:intersect="onIntersect" />
		</ul>
	</div>
</template>

<script>
var Observer = require( './base/Observer.vue');

module.exports = {
	name: 'SearchResults',

	components: {
		'observer': Observer
	},

	props: [
		'results'
	],

	methods: {
		onIntersect: function ( event ) {
			this.$emit( 'load-more' );
		}
	}
};
</script>