( function ( wb, util ) {
	'use strict';

	const SERIALIZER = require( 'wikibase.serialization' ),
		PARENT = SERIALIZER.Deserializer,
		MediaInfo = require( '../datamodel/MediaInfo.js' );

	/**
	 * @class wikibase.mediainfo.serialization.MediaInfoDeserializer
	 * @extends SERIALIZER.Deserializer
	 * @license GPL-2.0-or-later
	 * @author Adrian Heine <adrian.heine@wikimedia.de>
	 *
	 * @constructor
	 */
	module.exports = util.inherit( 'WbMediaInfoDeserializer', PARENT, {
		/**
		 * @inheritdoc
		 *
		 * @throws {Error} if serialization does not resolve to a serialized MediaInfo.
		 * @return {MediaInfo}
		 */
		deserialize: function ( serialization ) {
			if ( serialization.type !== MediaInfo.TYPE ) {
				throw new Error( 'Serialization does not resolve to an MediaInfo' );
			}

			const statementGroupSetDeserializer = new SERIALIZER.StatementGroupSetDeserializer();
			const termMapDeserializer = new SERIALIZER.TermMapDeserializer();

			return new MediaInfo(
				serialization.id,
				termMapDeserializer.deserialize( serialization.labels ),
				termMapDeserializer.deserialize( serialization.descriptions ),
				statementGroupSetDeserializer.deserialize( serialization.statements )
			);
		}
	} );

}( wikibase, util ) );
