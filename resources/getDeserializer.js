( function () {
	'use strict';
	var MediaInfoDeserializer = require( 'wikibase.mediainfo.serialization.MediaInfoDeserializer' );

	module.exports = function () {
		return new MediaInfoDeserializer();
	};
}() );
