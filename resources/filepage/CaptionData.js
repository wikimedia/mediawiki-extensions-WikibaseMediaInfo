'use strict';

var CaptionData;

/**
	* A value object holding all data for a caption
	*
	* @constructor
	* @param {string} [langCode] 2-letter language code
	* @param {string} [captionText]
	*/
CaptionData = function ( langCode, captionText ) {
	this.languageCode = langCode || '';
	this.languageText = $.uls.data.getAutonym( langCode );
	this.direction = $.uls.data.getDir( langCode );
	this.text = captionText || '';
};

module.exports = CaptionData;
