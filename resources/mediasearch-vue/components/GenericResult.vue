<template>
	<div class="wbmi-generic-result">
		{{ result.title }}
	</div>
</template>

<script>
// @vue/component
module.exports = {
	name: 'GenericResult',

	props: [ 'result' ]
};
</script>
