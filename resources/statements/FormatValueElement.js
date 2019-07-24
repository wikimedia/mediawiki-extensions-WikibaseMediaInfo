'use strict';

var FormatValueElement = function MediaInfoStatementsFormatValueElement() {};
OO.initClass( FormatValueElement );

FormatValueElement.cache = {};

/**
 * @param {dataValues.DataValue} dataValue
 * @param {string} format
 * @param {string} language
 * @return {string}
 */
FormatValueElement.getKey = function ( dataValue, format, language ) {
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
 * @param {string} result
 */
FormatValueElement.toCache = function ( key, result ) {
	FormatValueElement.cache[ key ] =
		$.Deferred().resolve( result ).promise( { abort: function () {} } );
};

/**
 * @param {dataValues.DataValue} dataValue
 * @param {string} [format] e.g. text/plain or text/html
 * @param {string} [language]
 * @return {jQuery.Promise}
 */
FormatValueElement.prototype.formatValue = function ( dataValue, format, language ) {
	var api,
		data = { type: dataValue.getType(), value: dataValue.toJSON() },
		stringified = JSON.stringify( data ),
		promise,
		key;

	api = wikibase.api.getLocationAgnosticMwApi(
		mw.config.get(
			'wbmiRepoApiUrl',
			mw.config.get( 'wbRepoApiUrl' )
		)
	);

	format = format || 'text/plain';
	language = language || mw.config.get( 'wgUserLanguage' );
	key = FormatValueElement.getKey( dataValue, format, language );

	if ( !( key in FormatValueElement.cache ) ) {
		promise = api.get( {
			action: 'wbformatvalue',
			format: 'json',
			datavalue: stringified,
			options: JSON.stringify( { lang: language } ),
			generate: format
		} );

		FormatValueElement.cache[ key ] = promise.then( function ( response ) {
			return response.result;
		} ).promise( { abort: function () {
			// replace the cached promise with a non-abortable one, so we can't
			// abort this once more (since there's only 1 underlying API request
			// to cancel...)
			FormatValueElement.cache[ key ] = FormatValueElement.cache[ key ].promise( { abort: function () {
				return FormatValueElement.cache[ key ];
			} } );
			// actually abort underlying API call
			promise.abort();
			// immediately delete from cache
			delete FormatValueElement.cache[ key ];
		} } );

		FormatValueElement.cache[ key ].catch( function () {
			// this promise seems to have failed, might as well remove this from
			// cache, so it's re-attempted next time we need this...
			delete FormatValueElement.cache[ key ];
		} );
	}

	return FormatValueElement.cache[ key ];
};

module.exports = FormatValueElement;
