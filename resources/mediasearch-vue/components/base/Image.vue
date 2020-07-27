<template>
	<img
		:data-src="source"
		:alt="alt"
		class="wbmi-image"
		loading="lazy"
	>
</template>

<script>

// @vue/component
module.exports = {
	props: {
		source: {
			type: String,
			required: true
		},

		alt: {
			type: String,
			default: ''
		}
	},

	/**
	 * Use an intersection observer to determine when the image has entered the
	 * viewport, then add the src attribute.
	 */
	mounted: function () {
		/**
		 * Callback function which is given to the Observer object; this is
		 * what gets executed when the element enters the viewport
		 *
		 * @param {Array} entries array of elements watched by the observer
		 */
		function intersectionCallback( entries ) {
			var entry = entries[ 0 ],
				image = entry.target;

			if ( entry && entry.isIntersecting ) {
				// set the "src" attribute so the image loads
				image.src = image.dataset.src;

				// remove the element from the observer's watch list so it
				// doesn't keep getting called
				this.observer.unobserve( image );
			}
		}

		this.observer = new IntersectionObserver(
			intersectionCallback.bind( this ), {
				root: null,
				threshold: 0
			} );

		this.observer.observe( this.$el );
	},

	/**
	 * Disconnect the observer when the component is destroyed
	 */
	destroyed: function () {
		this.observer.disconnect();
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';

.wbmi-image {
	.transition( opacity 0.2s ease );
	opacity: 0;

	&[ src ] {
		opacity: 1;
	}
}
</style>
