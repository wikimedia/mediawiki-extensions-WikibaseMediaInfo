<template>
	<div class="wbmi-media-search-spinner">
		<div class="wbmi-media-search-spinner-bounce"></div>
	</div>
</template>

<script>
// @vue/component
module.exports = {
	name: 'Spinner'
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import '../../mediainfo-variables.less';

.wbmi-media-search-spinner {
	@keyframes spinnerBounceDelay {
		0%,
		50%,
		100% {
			transform: scale( 0.625 );
		}

		// Equals 320ms.
		20% {
			opacity: 0.87;
			transform: scale( 1 );
		}
	}

	.flex-display();
	align-items: center;
	justify-content: center;
	padding: 48px 16px;
	white-space: nowrap;

	& .wbmi-media-search-spinner-bounce,
	&:before,
	&:after {
		animation: spinnerBounceDelay 1600ms ease-in-out -160ms infinite both;
		background-color: @color-base--subtle;
		border-radius: 100%;
		content: '';
		display: block;
		float: left;
		height: 12px;
		width: 12px;
	}

	&:before {
		animation-delay: -330ms;
		margin-right: 4px;
	}

	&:after {
		animation-delay: 0s;
		margin-left: 4px;
	}
}
</style>
