( function ( sd ) {

	'use strict';

	/**
	 * A value object holding all data for a caption
	 *
	 * @constructor
	 * @param {string} langCode 2-letter language code
	 * @param {string} langText Language autonym
	 * @param {string} langDir rtl or ltr
	 * @param {string} captionText
	 */
	sd.CaptionData = function CaptionData( langCode, langText, langDir, captionText ) {
		this.languageCode = langCode;
		this.languageText = langText;
		this.direction = langDir;
		this.text = captionText;
	};

}( mediaWiki.mediaInfo.structuredData ) );
