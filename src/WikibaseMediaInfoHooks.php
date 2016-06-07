<?php

namespace Wikibase\MediaInfo;

use Article;
use MediaWiki\MediaWikiServices;
use UnexpectedValueException;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\Repo\WikibaseRepo;

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
	 * @param string[] &$paths
	 */
	public static function onUnitTestsList( array &$paths ) {
		$paths[] = __DIR__ . '/../tests/phpunit/';
	}

	/**
	 * Hook to register the MediaInfo entity namespaces for EntityNamespaceLookup.
	 */
	public static function onWikibaseEntityNamespaces( &$entityNamespacesSetting ) {
		// XXX: ExtensionProcessor should define an extra config object for every extension.
		$config = MediaWikiServices::getInstance()->getMainConfig();

		// Setting the namespace to false disabled automatic registration.
		$entityNamespacesSetting['mediainfo'] = $config->get( 'MediaInfoNamespace' );
	}

	/**
	 * Hook to register the default namespace names with $wgExtraNamespaces.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/SetupAfterCache
	 */
	public static function onSetupAfterCache() {
		global $wgExtraNamespaces;

		// XXX: ExtensionProcessor should define an extra config object for every extension.
		$config = MediaWikiServices::getInstance()->getMainConfig();

		// Setting the namespace to false disabled automatic registration.
		$entityNamespace = $config->get( 'MediaInfoNamespace' );
		$talkNamespace = $config->get( 'MediaInfoTalkNamespace' );

		if ( $entityNamespace !== false ) {
			if ( !isset( $wgExtraNamespaces[$entityNamespace] ) && $entityNamespace >= 100 ) {
				$wgExtraNamespaces[$entityNamespace] = 'MediaInfo';
			}
		}

		if ( $talkNamespace !== false ) {
			if ( !isset( $wgExtraNamespaces[$talkNamespace] ) && $entityNamespace >= 100 ) {
				// XXX: Localize the default talk namespace?
				$wgExtraNamespaces[$talkNamespace] = 'MediaInfo_Talk';
			}
		}
	}

	/**
	 * Adds the definition of the media info entity type to the definitions array Wikibase uses.
	 *
	 * @see WikibaseMediaInfo.entitytypes.php
	 *
	 * @note: This is bootstrap code, it is executed for EVERY request. Avoid instantiating
	 * objects or loading classes here!
	 *
	 * @param array[] $entityTypeDefinitions
	 */
	public static function onWikibaseEntityTypes( array &$entityTypeDefinitions ) {
		$entityTypeDefinitions = array_merge(
			$entityTypeDefinitions,
			require __DIR__ . '/../WikibaseMediaInfo.entitytypes.php'
		);
	}

	public static function onMediaWikiServices( MediaWikiServices $services ) {
		// TODO: Use extension.json to put the wiring file into ($wg)ServiceWiringFiles.
		// TODO: We need better support for relative pathes in the extension loader for that to work!
		$wiringFile = __DIR__ . '/Services/MediaInfoServiceWiring.php';
		$services->loadWiringFiles( [ $wiringFile ] );
	}
}
