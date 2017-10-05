<?php

namespace Wikibase\MediaInfo;

use DatabaseUpdater;
use DeferredUpdates;
use File;
use ImagePage;
use MediaWiki\MediaWikiServices;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\WikibaseRepo;

/**
 * MediaWiki hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooks {

	/**
	 * Hook to register the MediaInfo entity namespaces for EntityNamespaceLookup.
	 *
	 * @param int[] $entityNamespacesSetting
	 */
	public static function onWikibaseEntityNamespaces( &$entityNamespacesSetting ) {
		// XXX: ExtensionProcessor should define an extra config object for every extension.
		$config = MediaWikiServices::getInstance()->getMainConfig();

		// Setting the namespace to false disabled automatic registration.
		$entityNamespacesSetting['mediainfo'] = $config->get( 'MediaInfoNamespace' );
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

	public static function onImagePageAfterImageLinks( ImagePage $page, &$html ) {
		$imgTitle = $page->getTitle();
		$pageId = $imgTitle->getArticleID();

		if ( !$pageId ) {
			return;
		}

		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		$entityId = $wikibaseRepo->getEntityIdComposer()->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		);
		$title = $wikibaseRepo->getEntityTitleLookup()->getTitleForId( $entityId );
		$linkHtml = MediaWikiServices::getInstance()->getLinkRenderer()->makeKnownLink( $title );

		$html .= '<h2>' . $linkHtml . '</h2>';
	}

	/**
	 * Schema changes.
	 * Hook: LoadExtensionSchemaUpdates
	 *
	 * @param DatabaseUpdater $updater
	 */
	public static function onLoadExtensionSchemaUpdates( DatabaseUpdater $updater ) {
		$updater->addPostDatabaseUpdateMaintenance( 'Wikibase\\MediaInfo\\Maintenance\\CreatePageProps' );
	}

	/**
	 * After file upload, insert a page_props entry referring to the MediaInfo entity id.
	 * Hook: FileUpload
	 *
	 * @param File $file
	 */
	public static function onFileUpload( File $file ) {
		// wrap creation of the page_props entry inside a deferred update or it'd
		// get blasted away right after having been created as part of finishing
		// up the upload process
		DeferredUpdates::addCallableUpdate(
			function () use ( $file ) {
				$title = $file->getTitle();
				if ( $title === null ) {
					return;
				}
				$pageId = $title->getArticleID();

				$wikibaseRepo = WikibaseRepo::getDefaultInstance();
				$entityId = $wikibaseRepo->getEntityIdComposer()->composeEntityId(
					'',
					MediaInfo::ENTITY_TYPE,
					$pageId
				);

				$file->getRepo()->getMasterDB()->insert(
					'page_props',
					[
						'pp_page' => $pageId,
						'pp_propname' => 'mediainfo_entity',
						'pp_value' => $entityId->getLocalPart(),
					],
					__METHOD__
				);
			},
			DeferredUpdates::POSTSEND,
			wfGetDB( DB_MASTER )
		);
	}

}
