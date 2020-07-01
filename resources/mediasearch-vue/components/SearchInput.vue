<template>
	<div>
		<input
			v-model="term"
			type="text"
			@keyup.enter="updateTerm"
		>

		<mw-button
			:primary="true"
			:progressive="true"
			@click="updateTerm"
		>
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
		};
	},

	methods: {
		updateTerm: function () {
			this.$emit( 'update', this.term );
		}
	}
};
</script>
