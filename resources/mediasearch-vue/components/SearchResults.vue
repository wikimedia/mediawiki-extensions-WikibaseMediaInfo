<template>
	<div>
		<ul>
			<li v-for="result in results" v-bind:key="result.pageid">
				{{ result.title }}
			</li>
		</ul>
	</div>
</template>

<script>
module.exports = {
	name: 'SearchResults',

	props: [
		'results'
	]
};
</script>