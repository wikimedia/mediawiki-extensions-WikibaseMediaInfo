( function ( statements ) {

	'use strict';

	statements.FormatValueElement = function MediaInfoStatementsFormatValueElement() {};
	OO.initClass( statements.FormatValueElement );

	statements.FormatValueElement.cache = {};

	/**
	 * @param {Object} data
	 * @param {string} format
	 * @param {string} language
	 * @return {string}
	 */
	statements.FormatValueElement.getKey = function ( data, format, language ) {
		return JSON.stringify( {
			data: data,
			format: format,
			language: language
		}, function ( key, value ) {
			// make sure the data gets sorted during stringify, or we might
			// end up with a different key for data that is essentially the
			// same, but where the properties were stringified in a different
			// order (e.g. {a:1,b:2} and {b:2,a:1})
			// @see https://gist.github.com/davidfurlong/463a83a33b70a3b6618e97ec9679e490
			if ( value instanceof Object && !( value instanceof Array ) ) {
				return Object.keys( value )
					.sort()
					.reduce( function ( sorted, key ) {
						sorted[ key ] = value[ key ];
						return sorted;
					}, {} );
			}

			return value;
		} );
	};

	/**
	 * @param {string} key
	 * @return {Promise}
	 */
	statements.FormatValueElement.fromCache = function ( key ) {
		var deferred = $.Deferred(),
			result = statements.FormatValueElement.cache[ key ];

		if ( result !== undefined ) {
			deferred.resolve( result );
		} else {
			deferred.reject();
		}

		return deferred.promise();
	};

	/**
	 * @param {string} key
	 * @param {string} result
	 */
	statements.FormatValueElement.toCache = function ( key, result ) {
		statements.FormatValueElement.cache[ key ] = result;
	};

	/**
	 * @param {Object} data
	 * @param {string} [format] e.g. text/plain or text/html
	 * @param {string} [language]
	 * @return {jQuery.Promise}
	 */
	statements.FormatValueElement.prototype.formatValue = function ( data, format, language ) {
		var api = new mw.Api(),
			stringified = JSON.stringify( data ),
			key;

		format = format || 'text/plain';
		language = language || mw.config.get( 'wgUserLanguage' );
		key = statements.FormatValueElement.getKey( data, format, language );

		return statements.FormatValueElement.fromCache( key ).catch( function () {
			return api.get( {
				action: 'wbformatvalue',
				format: 'json',
				datavalue: stringified,
				options: JSON.stringify( { lang: language } ),
				generate: format
			} ).then( function ( response ) {
				var result = response.result;
				statements.FormatValueElement.toCache( key, result );
				return result;
			} );
		} );
	};

}( mw.mediaInfo.statements ) );
