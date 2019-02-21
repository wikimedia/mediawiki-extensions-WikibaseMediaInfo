( function ( statements ) {

	'use strict';

	statements.FormatValueElement = function MediaInfoStatementsFormatValueElement() {};
	OO.initClass( statements.FormatValueElement );

	statements.FormatValueElement.cache = {};

	/**
	 * @param {dataValues.DataValue} dataValue
	 * @param {string} format
	 * @param {string} language
	 * @return {string}
	 */
	statements.FormatValueElement.getKey = function ( dataValue, format, language ) {
		return JSON.stringify( {
			data: { type: dataValue.getType(), value: dataValue.toJSON() },
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

		return deferred.promise( { abort: function () {} } );
	};

	/**
	 * @param {string} key
	 * @param {string} result
	 */
	statements.FormatValueElement.toCache = function ( key, result ) {
		statements.FormatValueElement.cache[ key ] = result;
	};

	/**
	 * @param {dataValues.DataValue} dataValue
	 * @param {string} [format] e.g. text/plain or text/html
	 * @param {string} [language]
	 * @return {jQuery.Promise}
	 */
	statements.FormatValueElement.prototype.formatValue = function ( dataValue, format, language ) {
		var api = new mw.Api(),
			data = { type: dataValue.getType(), value: dataValue.toJSON() },
			stringified = JSON.stringify( data ),
			promise,
			key;

		format = format || 'text/plain';
		language = language || mw.config.get( 'wgUserLanguage' );
		key = statements.FormatValueElement.getKey( dataValue, format, language );

		promise = statements.FormatValueElement.fromCache( key );
		return promise.catch( function () {
			// re-assign promise from within, because `api.get` is the one that needs
			// to expose its `abort` method
			promise = api.get( {
				action: 'wbformatvalue',
				format: 'json',
				datavalue: stringified,
				options: JSON.stringify( { lang: language } ),
				generate: format
			} );
			return promise.then( function ( response ) {
				var result = response.result;
				statements.FormatValueElement.toCache( key, result );
				return result;
			} );
		} ).promise( { abort: promise.abort } );
	};

}( mw.mediaInfo.statements ) );
