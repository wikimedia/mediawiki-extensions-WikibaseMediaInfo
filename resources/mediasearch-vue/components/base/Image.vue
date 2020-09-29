<template>
	<img
		:src="supportsObserver ? false : source"
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

	computed: {
		supportsObserver: function () {
			return 'IntersectionObserver' in window &&
				'IntersectionObserverEntry' in window &&
				'intersectionRatio' in window.IntersectionObserverEntry.prototype;
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

		if ( this.supportsObserver ) {
			this.observer = new IntersectionObserver(
				intersectionCallback.bind( this ), {
					root: null,
					threshold: 0
				} );

			this.observer.observe( this.$el );
		}
	},

	/**
	 * Disconnect the observer when the component is destroyed
	 */
	destroyed: function () {
		if ( this.supportsObserver ) {
			this.observer.disconnect();
		}
	}
};
</script>
