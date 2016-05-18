( function( wb, util ) {
	'use strict';

	var MODULE = wb.mediainfo.serialization,
		SERIALIZER = wb.serialization,
		PARENT = SERIALIZER.Deserializer;

	/**
	 * @class wikibase.serialization.MediaInfoDeserializer
	 * @extends wikibase.serialization.Deserializer
	 * @license GNU GPL v2+
	 * @author Adrian Heine <adrian.heine@wikimedia.de>
	 *
	 * @constructor
	 */
	MODULE.MediaInfoDeserializer = util.inherit( 'WbMediaInfoDeserializer', PARENT, {
		/**
		 * @inheritdoc
		 *
		 * @return {wikibase.datamodel.MediaInfo}
		 *
		 * @throws {Error} if serialization does not resolve to a serialized MediaInfo.
		 */
		deserialize: function( serialization ) {
			if ( serialization.type !== wb.datamodel.MediaInfo.TYPE ) {
				throw new Error( 'Serialization does not resolve to an MediaInfo' );
			}

			var statementGroupSetDeserializer = new SERIALIZER.StatementGroupSetDeserializer(),
				termMapDeserializer = new SERIALIZER.TermMapDeserializer();

			return new wikibase.datamodel.MediaInfo(
				serialization.id,
				termMapDeserializer.deserialize( serialization.labels ),
				termMapDeserializer.deserialize( serialization.descriptions ),
				statementGroupSetDeserializer.deserialize( serialization.statements )
			);
		}
	} );

}( wikibase, util ) );
