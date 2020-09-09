<template>
	<span class="wbmi-icon" :class="builtInClasses">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 20 20"
			:aria-hidden="lacksTitle"
		>
			<title v-if="iconTitle">{{ iconTitle }}</title>
			<g :fill="iconColor">
				<path :d="iconPath" />
			</g>
		</svg>
	</span>
</template>

<script>
/**
 * SVG icon.
 *
 * This is a copy of the WVUI Icon component and can only be used if icon paths
 * are available in this codebase. To use a new icon, find the icon in
 * src/themes/icons.ts in the WVUI library, copy the icon data, and paste it
 * info lib/icons.js in this extension. Import the icon into the Vue component
 * where it is to be used, assign it to a variable in the component's data
 * option, then use v-bind to set the icon attribute of the <wvui-icon> element
 * to that name.
 *
 * Icon data can follow the following formats:
 * 1. For icons with a single path that don't flip for RTL languages:
 *    'M11 9V4H9v5H4v2h5v5h2v-5h5V9z'
 * 2. For icons that should be flipped horizontally for RTL languages:
 *    {
 *        // Icon SVG path.
 *        path: 'M11 9V4H9v5H4v2h5v5h2v-5h5V9z'
 *        // Flippable must be true.
 *        flippable: true
 *        // Array of language codes for which icon should not flip.
 *        shouldFlipExceptions: [ 'ar' ]
 *    }
 * 3. For icons that vary per language:
 *    {
 *        // Icon paths per language code.
 *        langCodeMap: {
 *            en: 'M5 17V3h3v12h7v2z'
 *            de: 'M15 5V3H5v14h3v-6h5.833V9H8V5z'
 *        }
 *        // Default SVG path.
 *        default: 'M11 9V4H9v5H4v2h5v5h2v-5h5V9z'
 *    }
 * 4. For icons that differ per text direction, but can't just be flipped:
 *    {
 *        // Icon SVG path for RTL languages.
 *        rtl: 'M5 17V3h3v12h7v2z'
 *        // Default SVG path.
 *        default: 'M11 9V4H9v5H4v2h5v5h2v-5h5V9z'
 *    }
 */
module.exports = {
	name: 'WbmiIcon',

	props: {
		/** The SVG path or an object containing that path plus other data. */
		icon: {
			type: [ String, Object ],
			required: true
		},

		/** Numerical color value (e.g. hex code, rgba) or keyword. */
		iconColor: {
			type: String,
			default: 'currentColor'
		},

		/**
		 * Accessible title for SVG. String or message object. If not included,
		 * the SVG will be hidden from screen readers.
		 */
		iconTitle: {
			type: [ String, Object ],
			default: ''
		},

		/** Explicitly set the language or default to document lang. */
		langCode: {
			type: String,
			default: function () {
				return document.documentElement.lang;
			}
		}
	},

	data: function () {
		return {
			dir: document.documentElement.dir
		};
	},

	computed: {
		builtInClasses: function () {
			return {
				'wbmi-icon--flip-for-rtl': this.shouldFlip
			};
		},

		shouldFlip: function () {
			var exception;

			if ( typeof this.icon === 'string' ) {
				return false;
			}

			if ( 'shouldFlipExceptions' in this.icon ) {
				// Don't flip if the current language is listed as an exception.
				exception = this.icon.shouldFlipExceptions.indexOf( this.langCode );
				return exception === undefined || exception === -1;
			}

			if ( 'shouldFlip' in this.icon ) {
				return !!this.icon.shouldFlip;
			}

			return false;
		},

		lacksTitle: function () {
			return !this.iconTitle;
		},

		iconPath: function () {
			var langCodeIcon;

			if ( typeof this.icon === 'string' ) {
				return this.icon;
			}

			// Icon with a single path.
			if ( 'path' in this.icon ) {
				return this.icon.path;
			}

			// Icon that differs per language.
			if ( 'langCodeMap' in this.icon ) {
				langCodeIcon = this.langCode in this.icon.langCodeMap ?
					this.icon.langCodeMap[ this.langCode ] :
					this.icon.default;
				return typeof langCodeIcon === 'string' ? langCodeIcon : langCodeIcon.path;
			}

			// Icon that differs between LTR and RTL languages but can't just
			// be flipped horizontally.
			return this.dir === 'rtl' ? this.icon.rtl : this.icon.default;
		}
	},

	mounted: function () {
		var computedStyle = window.getComputedStyle( this.$el );
		this.dir = computedStyle.direction || this.dir;
	}
};
</script>
