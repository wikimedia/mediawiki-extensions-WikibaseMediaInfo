<?php

namespace Wikibase\MediaInfo;

use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;

/**
 * MediaWiki hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooks {

	/**
	 * Hook to add all tests, including those that depend on MediaWiki.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/UnitTestsList
	 *
	 * @since 0.1
	 *
	 * @param string[] &$paths
	 */
	public static function onUnitTestsList( array &$paths ) {
		$paths[] = __DIR__ . '/../tests/phpunit/';
	}

	/**
	 * Returns the common definition of the media info entity type that both repo and client use.
	 *
	 * @return array
	 */
	private static function getCommonMediaInfoDefinition() {
		return [
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
			}
		];
	}

	/**
	 * Adds the definition of the media info entity type to the definitions array Wikibase uses.
	 *
	 * @param $entityTypeDefinitions
	 */
	public static function onWikibaseRepoEntityTypes( &$entityTypeDefinitions ) {
		$entityTypeDefinitions['mediainfo'] = array_merge(
			self::getCommonMediaInfoDefinition(),
			[
				// TODO
			]
		);
	}

	/**
	 * Adds the definition of the media info entity type to the definitions array Wikibase uses.
	 *
	 * @param $entityTypeDefinitions
	 */
	public static function onWikibaseClientEntityTypes( &$entityTypeDefinitions ) {
		$entityTypeDefinitions['mediainfo'] = array_merge(
			self::getCommonMediaInfoDefinition(),
			[
				// TODO
			]
		);
	}

}
