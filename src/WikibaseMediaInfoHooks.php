<?php

namespace Wikibase\MediaInfo;

/**
 * MediaWiki hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooks {

	/**
	 * Hook to add integration tests that depend on MediaWiki.
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
			// TODO
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
