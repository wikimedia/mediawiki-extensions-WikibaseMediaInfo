<template>
	<div v-bind:class="'wbmi-mediasearch-results--' + mediaType"
		class="wbmi-mediasearch-results">

		<template v-for="(result, index) in sortedResults[ mediaType ]">
			<component
				v-bind:is="resultComponent"
				v-bind:result="result"
				v-bind:key="index"
			/>
		</template>

		<observer v-on:intersect="onIntersect" />
	</div>
</template>

<script>
var mapState = require( 'vuex' ).mapState,
	mapGetters = require( 'vuex' ).mapGetters,
	ImageResult = require( './ImageResult.vue' ),
	GenericResult = require( './GenericResult.vue' ),
	Observer = require( './base/Observer.vue');

module.exports = {
	name: 'SearchResults',

	components: {
		'observer': Observer,
		'image-result': ImageResult,
		'generic-result': GenericResult
	},

	props: {
		mediaType: {
			type: String,
			required: true
		}
	},

	computed: $.extend( {}, mapState( [
		'results'
	] ), mapGetters( [
		'sortedResults'
	] ), {
		resultComponent: function () {
			if ( this.mediaType === 'bitmap' ) {
				return 'image-result'
			} else {
				return 'generic-result'
			}
		}
	} ),

	methods: {
		onIntersect: function ( event ) {
			this.$emit( 'load-more' );
		}
	}
};
</script>

<style lang="less">

.wbmi-mediasearch-results {
	&--bitmap {
		display: flex;
		flex-wrap: wrap;
	}
}

</style>
