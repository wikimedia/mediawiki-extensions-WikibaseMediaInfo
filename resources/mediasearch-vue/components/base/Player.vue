<template>
	<video ref="videoPlayer"
		class="wbmi-player video-js vjs-16-9 vjs-big-play-centered"
		:src="fallbackUrl"
		:poster="options.poster"
		controls>
	</video>
</template>

<script>
// @vue/component
module.exports = {
	name: 'WbmiPlayer',

	props: {
		options: {
			type: Object,
			default: function () {
				return {};
			}
		},

		fallbackUrl: {
			type: String,
			default: ''
		}
	},

	data: function () {
		return {
			player: null
		};
	},

	methods: {
		onPlay: function () {
			this.$emit( 'play' );
		}
	},

	mounted: function () {
		// Videojs is provided by the ext.tmh.video-js resource module
		// from the TimedMediaHandler Extension. See:
		// https://www.mediawiki.org/wiki/Extension:TimedMediaHandler
		// for more information
		mw.loader.using( 'ext.tmh.video-js' ).then( function () {
			this.player = window.videojs(
				this.$refs.videoPlayer,
				this.options,
				function onPlayerReady() {}
			);

			this.player.on( 'play', this.onPlay );
		}.bind( this ) );
	},

	destroyed: function () {
		if ( this.player ) {
			this.player.dispose();
		}
	}
};
</script>
