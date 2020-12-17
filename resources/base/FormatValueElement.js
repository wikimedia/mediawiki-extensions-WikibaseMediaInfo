'use strict';

var FormatValueElement = function MediaInfoStatementsFormatValueElement() {};
OO.initClass( FormatValueElement );

FormatValueElement.cache = {};

/**
 * @param {dataValues.DataValue} dataValue
 * @param {string} format
 * @param {string} language
 * @param {string} [propertyId]
 * @return {string}
 */
FormatValueElement.getKey = function ( dataValue, format, language, propertyId ) {
	return JSON.stringify( {
		data: { type: dataValue.getType(), value: dataValue.toJSON() },
		format: format,
		language: language,
		property: propertyId
	}, function ( key, value ) {
		// make sure the data gets sorted during stringify, or we might
		// end up with a different key for data that is essentially the
		// same, but where the properties were stringified in a different
		// order (e.g. {a:1,b:2} and {b:2,a:1})
		// @see https://gist.github.com/davidfurlong/463a83a33b70a3b6618e97ec9679e490
		if ( value instanceof Object && !( value instanceof Array ) ) {
			return Object.keys( value )
				.sort()
				.reduce( function ( sorted, sortedKey ) {
					sorted[ sortedKey ] = value[ sortedKey ];
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
 * @param {string} [propertyId] Used when property-specific formatting rules are required
 * @return {jQuery.Promise}
 */
FormatValueElement.prototype.formatValue = function ( dataValue, format, language, propertyId ) {
	var api,
		data = { type: dataValue.getType(), value: dataValue.toJSON() },
		stringified = JSON.stringify( data ),
		promise,
		params,
		key,
		otherKey;

	api = wikibase.api.getLocationAgnosticMwApi(
		mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) ),
		{ anonymous: true }
	);

	format = format || 'text/plain';
	language = language || mw.config.get( 'wgUserLanguage' );
	key = FormatValueElement.getKey( dataValue, format, language, propertyId );

	// backward compatibility for output generated before property ids
	// were included - this can be deleted after parser caches expire
	// (30 days after this patch got deployed, so probably ~ february 2020)
	if ( !( key in FormatValueElement.cache ) && propertyId !== undefined ) {
		otherKey = FormatValueElement.getKey( dataValue, format, language );
		if ( otherKey in FormatValueElement.cache ) {
			return FormatValueElement.cache[ otherKey ];
		}
	}

	if ( !( key in FormatValueElement.cache ) ) {
		params = {
			action: 'wbformatvalue',
			datavalue: stringified,
			format: 'json',
			generate: format,
			options: JSON.stringify( { lang: language } ),
			property: propertyId
		};
		promise = api.get( params );

		FormatValueElement.cache[ key ] = promise.then( function ( response ) {
			return response.result || '';
		} ).promise( { abort: function () {
			if ( !( key in FormatValueElement.cache ) ) {
				// request already aborted/failed and cleaned out of cache
				return;
			}
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
