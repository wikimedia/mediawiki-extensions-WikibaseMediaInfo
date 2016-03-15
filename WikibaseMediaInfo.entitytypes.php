<?php

/**
 * Definition of the media info entity type.
 * The array returned by the code below is supposed to be merged into $wgWBRepoEntityTypes.
 *
 * @note: Keep in sync with Wikibase
 *
 * @note: This is bootstrap code, it is executed for EVERY request. Avoid instantiating
 * objects or loading classes here!
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */

use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;
use Wikibase\Repo\WikibaseRepo;

return [
	'mediainfo' => [
		'serializer-factory-callback' => function( SerializerFactory $serializerFactory ) {
			return new MediaInfoSerializer(
				$serializerFactory->newTermListSerializer(),
				$serializerFactory->newStatementListSerializer()
			);
		},
		'deserializer-factory-callback' => function( DeserializerFactory $deserializerFactory ) {
			return new MediaInfoDeserializer(
				$deserializerFactory->newTermListDeserializer(),
				$deserializerFactory->newStatementListDeserializer()
			);
		},
		'content-model-id' => MediaInfoContent::CONTENT_MODEL_ID,
		'content-handler-factory-callback' => function() {
			$wikibaseRepo = WikibaseRepo::getDefaultInstance();

			return new MediaInfoHandler(
				$entityPerPage = $wikibaseRepo->getStore()->newEntityPerPage(),
				$termIndex = $wikibaseRepo->getStore()->getTermIndex(),
				$codec = $wikibaseRepo->getEntityContentDataCodec(),
				$constraintProvider = $wikibaseRepo->getEntityConstraintProvider(),
				$errorLocalizer = $wikibaseRepo->getValidatorErrorLocalizer(),
				$wikibaseRepo->getEntityIdParser()
			);
		}
	]
];
