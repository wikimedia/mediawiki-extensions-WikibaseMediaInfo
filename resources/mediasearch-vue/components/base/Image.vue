<template>
	<img
		:src="supportsObserver ? false : source"
		:data-src="source"
		:alt="alt"
		class="wbmi-image"
		loading="lazy"
		:style="imageStyle"
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
		},

		originalWidth: {
			type: Number,
			default: 0
		},

		originalHeight: {
			type: Number,
			default: 0
		}
	},

	computed: {
		/**
		 * @return {boolean}
		 */
		supportsObserver: function () {
			return 'IntersectionObserver' in window &&
				'IntersectionObserverEntry' in window &&
				'intersectionRatio' in window.IntersectionObserverEntry.prototype;
		},

		/**
		 * If we have image dimensions, add a style attribute to constrain the
		 * image to its original size to avoid stretching a small image.
		 *
		 * @return {Object|boolean}
		 */
		imageStyle: function () {
			if ( this.originalWidth > 0 && this.originalHeight > 0 ) {
				return {
					// There are height and max-width rules with the important
					// keyword for .content a > img in Minerva Neue, and they
					// have to be overridden.
					// I don't see any other way around this...
					height: '100% !important',
					maxWidth: this.originalWidth + 'px !important',
					maxHeight: this.originalHeight + 'px'
				};
			}

			return false;
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
					// Set the detection area to extend past the bottom of the
					// viewport by 50% (a figure that comes from MobileFrontEnd) so
					// images will load before they enter the viewport.
					rootMargin: '0px 0px 50% 0px',
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
