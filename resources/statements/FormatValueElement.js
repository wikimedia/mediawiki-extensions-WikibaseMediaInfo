( function ( statements ) {

	'use strict';

	statements.FormatValueElement = function MediaInfoStatementsFormatValueElement() {};
	OO.initClass( statements.FormatValueElement );

	/**
	 * @param {Object} data
	 * @param {string} format e.g. text/plain or text/html
	 * @param {string} language
	 * @return {jQuery.Promise}
	 */
	statements.FormatValueElement.prototype.formatValue = function ( data, format, language ) {
		var api = new mw.Api();

		return api.get( {
			action: 'wbformatvalue',
			format: 'json',
			datavalue: JSON.stringify( data ),
			options: JSON.stringify( {
				lang: language || mw.config.get( 'wgUserLanguage' )
			} ),
			generate: format || 'text/plain'
		} );
	};

}( mw.mediaInfo.statements ) );
