'use strict';

var GetRepoElement = function MediaInfoStatementsGetRepoElement() {};
OO.initClass( GetRepoElement );

GetRepoElement.interwikiMapPromise = undefined;

/**
 * @param {string} url
 * @return {jQuery.Promise}
 */
GetRepoElement.prototype.getRepoFromUrl = function ( url ) {
	var api = wikibase.api.getLocationAgnosticMwApi( mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) ) );

	if ( GetRepoElement.interwikiMapPromise === undefined ) {
		GetRepoElement.interwikiMapPromise = api.get( {
			action: 'query',
			meta: 'siteinfo',
			siprop: 'interwikimap',
			sifilteriw: 'local'
		} ).then(
			function ( result ) {
				return result.query.interwikimap;
			},
			function () {
				// error = delete promise, allowing API call to be executed again next time
				GetRepoElement.interwikiMapPromise = undefined;
			}
		);
	}

	return GetRepoElement.interwikiMapPromise.then( function ( interwikiMap ) {
		var matches = interwikiMap.filter( function ( interwiki ) {
			var regex = interwiki.url.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' ).replace( '\\$1', '.*?' );
			return new RegExp( regex ).test( url );
		} );
		return matches.length === 0 ? 'local' : matches[ 0 ].prefix;
	} );
};

module.exports = GetRepoElement;
