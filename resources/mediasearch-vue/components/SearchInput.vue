<template>
	<div>
		<input 
			v-model="term" 
			v-on:keyup.enter="updateTerm"
			type="text"
		>

		<mw-button 
			v-on:click="updateTerm"
			v-bind:primary="true" 
			v-bind:progressive="true">
			{{ $i18n( 'searchbutton' ) }}
		</mw-button>
	</div>
</template>

<script>
var Button = require( './base/Button.vue' );

module.exports = {
	name: 'SearchInput',

	components: {
		'mw-button': Button
	},

	props: {
		initialTerm: String
	},

	data: function () {
		return {
			term: this.initialTerm
		}
	},

	methods: {
		updateTerm: function () {
			this.$emit( 'update', this.term );
		}
	}
};
</script>