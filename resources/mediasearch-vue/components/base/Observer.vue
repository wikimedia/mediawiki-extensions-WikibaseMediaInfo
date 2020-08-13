<template>
	<div class="wbmi-observer"></div>
</template>

<script>
/**
 * Observer.vue
 *
 * This component is a simple wrapper for an Intersection Observer object
 * (https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API),
 * which provides a simple way to determine when an element intersects with the
 * viewport (or a specific subsection of the viewport).
 *
 * By itself this component should have no visual or behavioral impact on the
 * UI. It simply emits an "intersect" event which can be handled by the parent
 * as needed. Add this component to the end of a list for an "infinite scroll"
 * effect.
 */
module.exports = {
	name: 'WbmiObserver',

	props: {
		options: Object
	},

	data: function () {
		return {
			observer: null
		};
	},

	/**
	 * Create an intersection observer when the Observer component mounts
	 */
	mounted: function () {
		var options = this.options || {};

		function intersectionCallback( entries ) {
			// An array of entries will be passed to the callback,
			// but we only care about the first element
			var entry = entries[ 0 ];

			if ( entry && entry.isIntersecting ) {
				this.$emit( 'intersect' );
			}
		}

		this.observer = new IntersectionObserver(
			intersectionCallback.bind( this ), // what to do when intersection occurrs
			options // additional options can be provided as props to this component
		);

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
