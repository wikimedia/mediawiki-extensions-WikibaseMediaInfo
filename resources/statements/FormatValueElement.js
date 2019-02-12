( function ( statements ) {

	'use strict';

	statements.FormatValueElement = function MediaInfoStatementsFormatValueElement() {};
	OO.initClass( statements.FormatValueElement );

	statements.FormatValueElement.cache = {};

	/**
	 * @param {Object} data
	 * @param {string} format e.g. text/plain or text/html
	 * @param {string} language
	 * @return {jQuery.Promise}
	 */
	statements.FormatValueElement.prototype.formatValue = function ( data, format, language ) {
		var api = new mw.Api(),
			stringified = JSON.stringify( data );

		format = format || 'text/plain';
		language = language || mw.config.get( 'wgUserLanguage' );

		if ( !statements.FormatValueElement.cache[ stringified + format + language ] ) {
			// just in case we'll end up doing multiple formats for the same
			// data - let's just keep them around and re-use the previous results...
			statements.FormatValueElement.cache[ stringified + format + language ] = api.get( {
				action: 'wbformatvalue',
				format: 'json',
				datavalue: stringified,
				options: JSON.stringify( { lang: language } ),
				generate: format
			} );
		}

		return statements.FormatValueElement.cache[ stringified + format + language ];
	};

}( mw.mediaInfo.statements ) );
