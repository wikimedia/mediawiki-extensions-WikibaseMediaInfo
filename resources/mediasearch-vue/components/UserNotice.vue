<template>
	<transition v-if="showNotice" name="wbmi-fade-out">
		<wbmi-message class="wbmi-search-user-notice__message" type="notice">
			<p>
				<span
					v-i18n-html:wikibasemediainfo-special-mediasearch-user-notice-title
					class="wbmi-search-user-notice__title"
				></span>
				<br> <span v-i18n-html:wikibasemediainfo-special-mediasearch-user-notice-body></span>
			</p>
			<wbmi-button
				class="wbmi-search-user-notice__dismiss-button"
				:invisible-text="true"
				:frameless="true"
				:icon="closeIcon"
				@click="dismiss"
			>
				{{ $i18n( 'wikibasemediainfo-special-mediasearch-user-notice-dismiss' ) }}
			</wbmi-button>
		</wbmi-message>
	</transition>
</template>

<script>
var Button = require( './base/Button.vue' ),
	closeIcon = require( '../../../../lib/icons.js' ).wbmiIconClose,
	Message = require( './base/Message.vue' ),
	specialSearchLink = 'https://meta.wikimedia.org/wiki/Special:Search';

// @vue/component
module.exports = {
	name: 'wbmi-search-user-notice',

	components: {
		'wbmi-button': Button,
		'wbmi-message': Message
	},

	data: function () {
		return {
			prefKey: 'sdms-search-user-notice-dismissed',
			closeIcon: closeIcon,
			specialSearchLink: specialSearchLink,
			dismissed: false
		};
	},

	computed: {
		previouslyDismissed: function () {
			var numVal = Number( mw.user.options.get( this.prefKey ) );
			return Boolean( numVal );
		},

		showNotice: function () {
			if ( mw.user.isAnon() ) {
				return false;
			} else {
				return !this.previouslyDismissed && !this.dismissed;
			}
		}
	},

	methods: {
		dismiss: function () {
			new mw.Api().saveOption( this.prefKey, 1 );
			mw.user.options.set( this.prefKey, 1 );
			this.dismissed = true;
		}
	}
};
</script>
