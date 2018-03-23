<?php

namespace Wikibase\MediaInfo;

use AbstractContent;
use CirrusSearch\Search\CirrusIndexField;
use Content;
use DatabaseUpdater;
use CirrusSearch\Connection;
use Elastica\Document;
use ImagePage;
use MediaWiki\MediaWikiServices;
use ParserOutput;
use Title;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\Store\EntityTitleStoreLookup;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use WikiPage;

/**
 * MediaWiki hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooks {

	/**
	 * @var EntityIdComposer
	 */
	private $entityIdComposer;
	/**
	 * @var EntityTitleStoreLookup
	 */
	private $entityTitleStoreLookup;

	private static function newFromGlobalState() {
		$wikibaseRepo = WikibaseRepo::getDefaultInstance();

		return new self(
			$wikibaseRepo->getEntityIdComposer(),
			$wikibaseRepo->getEntityTitleLookup()
		);
	}

	public function __construct(
		EntityIdComposer $entityIdComposer,
		EntityTitleStoreLookup $entityTitleStoreLookup
	) {
		$this->entityIdComposer = $entityIdComposer;
		$this->entityTitleStoreLookup = $entityTitleStoreLookup;
	}

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

	public static function onGetEntityByLinkedTitleLookup( EntityByLinkedTitleLookup &$lookup ) {
		$lookup = new MediaInfoByLinkedTitleLookup( $lookup );
	}

	public static function onCirrusSearchBuildDocumentParse(
		Document $document,
		Title $title,
		\AbstractContent $contentObject,
		ParserOutput $parserOutput,
		Connection $connection
	) {
		self::newFromGlobalState()->doCirrusSearchBuildDocumentParse(
			$document,
			$title,
			$contentObject
		);
	}

	public function doCirrusSearchBuildDocumentParse(
		Document $document,
		Title $title,
		AbstractContent $contentObject
	) {
		if ( $contentObject instanceof \WikitextContent && $title->inNamespace( NS_FILE ) ) {
			$this->updateFilePageIndexWithMediaInfoData(
				$title,
				$document
			);
		}
	}

	private function updateFilePageIndexWithMediaInfoData(
		Title $filePageTitle,
		Document $document
	) {
		$mediaInfoPage = $this->getMediaInfoPageForFilePageTitle( $filePageTitle );
		if ( !is_null( $mediaInfoPage ) ) {
			$engine = new \CirrusSearch();
			/** @var MediaInfoHandler $contentHandler */
			$contentHandler = $mediaInfoPage->getContentHandler();

			$fieldDefinitions = $contentHandler->getFieldsForSearchIndex( $engine );
			$dataForFilePageIndex = $contentHandler->getDataForFilePageSearchIndex( $mediaInfoPage );

			foreach ( $dataForFilePageIndex as $field => $fieldData ) {
				$document->set( $field, $fieldData );
				if ( isset( $fieldDefinitions[$field] ) ) {
					$hints = $fieldDefinitions[$field]->getEngineHints( $engine );
					CirrusIndexField::addIndexingHints( $document, $field, $hints );
				}
			}

			// Add a version check so this search index update will be discarded if the MediaInfo
			// revision id is lower that the stored one
			CirrusIndexField::addNoopHandler(
				$document,
				MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION,
				'documentVersion'
			);
		}
	}

	/**
	 * The ID for a MediaInfo item is the same as the ID of its associated File page, with an
	 * 'M' prepended - this is encapsulated by EntityIdComposer::composeEntityId()
	 *
	 * @param Title $filePageTitle
	 * @return WikiPage|null Returns null if there is no corresponding File page for MediaInfo item
	 */
	private function getMediaInfoPageForFilePageTitle( Title $filePageTitle ) {
		$entityId = $this->entityIdComposer->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$filePageTitle->getArticleID()
		);
		$mediaInfoTitle = $this->entityTitleStoreLookup->getTitleForId( $entityId );
		if ( $mediaInfoTitle->exists() ) {
			return WikiPage::factory( $mediaInfoTitle );
		}
		return null;
	}

}
