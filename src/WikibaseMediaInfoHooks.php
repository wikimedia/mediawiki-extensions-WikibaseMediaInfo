<?php

namespace Wikibase\MediaInfo;

use Content;
use DatabaseUpdater;
use ImagePage;
use MediaWiki\MediaWikiServices;
use ParserOutput;
use Title;
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
	 * Add a page_props referencing the MediaInfo entity.
	 * LinksUpdate.php will fetch the props from ParserOutput & store them to DB right after
	 * creating a page, so we just have to add the page_props entry there.
	 * This is preferable to adding in DB after upload (say FileUpload hook), because it would get
	 * wiped out once LinksUpdate runs...
	 *
	 * Hook: ContentAlterParserOutput
	 *
	 * @param Content $content
	 * @param Title $title
	 * @param ParserOutput $output
	 * @return bool
	 */
	public static function onContentAlterParserOutput(
		Content $content,
		Title $title,
		ParserOutput $output
	) {
		if ( !$title->inNamespace( NS_FILE ) ) {
			return true;
		}

		if ( $output->getProperty( 'mediainfo_entity' ) !== false ) {
			return true;
		}

		$pageId = $title->getArticleID();
		if ( $pageId === 0 ) {
			return true;
		}

		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		$entityId = $wikibaseRepo->getEntityIdComposer()->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		);

		$output->setProperty( 'mediainfo_entity', $entityId->getLocalPart() );

		return true;
	}

}
