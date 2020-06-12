<template>
	<div>
		{{ resultsData }}
	</div>
</template>

<script>
module.exports = {
	name: 'SearchResults',

	props: [
		'resultsData'
	]
};
</script>