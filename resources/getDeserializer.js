( function () {
	'use strict';
	const MediaInfoDeserializer = require( 'wikibase.mediainfo.serialization.MediaInfoDeserializer' );

	module.exports = function () {
		return new MediaInfoDeserializer();
	};
}() );
