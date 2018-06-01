<?php

namespace Wikibase\MediaInfo;

use AbstractContent;
use CirrusSearch\Search\CirrusIndexField;
use Content;
use DatabaseUpdater;
use CirrusSearch\Connection;
use Elastica\Document;
use FormatJson;
use ImagePage;
use MediaWiki\MediaWikiServices;
use ParserOutput;
use RequestContext;
use Title;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\Lib\Store\EntityInfoTermLookup;
use Wikibase\Lib\Store\LanguageFallbackLabelDescriptionLookup;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\Repo\MediaWikiLanguageDirectionalityLookup;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\Repo\ParserOutput\FallbackHintHtmlTermRenderer;
use Wikibase\Repo\Store\EntityTitleStoreLookup;
use Wikibase\Repo\View\RepoSpecialPageLinker;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\View\SimpleEntityTermsView;
use Wikibase\View\Template\TemplateFactory;
use Wikibase\View\TermsListView;
use Wikibase\View\ToolbarEditSectionGenerator;
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

	/**
	 * Check if we're on a file page, add Wikibase modules if so
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 */
	public static function onBeforePageDisplay( $out, $skin ) {
		$imgTitle = $out->getTitle();
		if ( !$imgTitle->exists() || !$imgTitle->inNamespace( NS_FILE ) ) {
			return;
		}

		$pageId = $imgTitle->getArticleID();
		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		$entityId = $wikibaseRepo->getEntityIdComposer()->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		);

		$entityRevisionLookup = $wikibaseRepo->getEntityRevisionLookup();
		$entityRevision = $entityRevisionLookup->getEntityRevision(
			$entityId
		);

		if ( $entityRevision === null ) {
			$entityRevisionId = 0;
		} else {
			$entityRevisionId = $entityRevision->getRevisionId();
		}

		$entityLookup = $wikibaseRepo->getEntityLookup();
		$entity = $entityLookup->getEntity( $entityId );

		if ( $entity !== null ) {
			$entitySerializer = $wikibaseRepo->getCompactEntitySerializer();
			$serializedEntity = $entitySerializer->serialize( $entity );
		} else {
			$serializedEntity = [
				'type' => MediaInfo::ENTITY_TYPE,
				'id' => $entityId->getSerialization(),
				'labels' => [],
				'descriptions' => [],
				'statements' => [],
			];
		}

		$entityJson = FormatJson::encode( $serializedEntity );

		$request = RequestContext::getMain();
		$language = $request->getLanguage();
		$languageFallbackChainFactory = $wikibaseRepo->getLanguageFallbackChainFactory();
		$languageFallbackChain = $languageFallbackChainFactory->newFromLanguage( $language );

		$out->addJsConfigVars( [
			'wbEntity' => $entityJson,
			'wbIsEditView' => true,
			'wbUserSpecifiedLanguages' => $languageFallbackChain->getFetchLanguageCodes(),
			'wbCurrentRevision' => $entityRevisionId,
		] );

		$out->addModuleStyles( [
			'wikibase.common',
			'jquery.ui.core.styles',
			'jquery.wikibase.statementview.RankSelector.styles',
			'jquery.wikibase.toolbar.styles',
			'jquery.wikibase.toolbarbutton.styles',
		] );

		$out->addModules( 'wikibase.mediainfo.filePageDisplay' );
	}

	/**
	 * @param ImagePage $page
	 * @param string &$html
	 */
	public static function onImagePageAfterImageLinks( ImagePage $page, &$html ) {
		$imgTitle = $page->getTitle();
		$pageId = $imgTitle->getArticleID();

		if ( !$pageId ) {
			return;
		}

		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		$store = $wikibaseRepo->getStore();
		$entityId = $wikibaseRepo->getEntityIdComposer()->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		);
		$title = $wikibaseRepo->getEntityTitleLookup()->getTitleForId( $entityId );
		$linkHtml = MediaWikiServices::getInstance()->getLinkRenderer()->makeKnownLink( $title );

		$html .= '<h2>' . $linkHtml . '</h2>';

		$entityLookup = $wikibaseRepo->getEntityLookup();
		$entity = $entityLookup->getEntity( $entityId );

		$request = RequestContext::getMain();
		$language = $request->getLanguage();
		$languageCode = $language->getCode();
		$languageFallbackChainFactory = $wikibaseRepo->getLanguageFallbackChainFactory();
		$languageFallbackChain = $languageFallbackChainFactory->newFromLanguage( $language );
		$templateFactory = TemplateFactory::getDefaultInstance();
		$textProvider = new MediaWikiLocalizedTextProvider( $languageCode );

		$epogf = $wikibaseRepo->getEntityParserOutputGeneratorFactory();
		$epog = $epogf->getEntityParserOutputGenerator( $languageCode );

		if ( $entity === null ) {
			$entityFactory = $wikibaseRepo->getEntityFactory();
			$entity = $entityFactory->newEmpty( MediaInfo::ENTITY_TYPE );
		}

		$parserOutput = $epog->getParserOutput( $entity, false );
		$entityIds = $parserOutput->getExtensionData( 'referenced-entities' );

		if ( !is_array( $entityIds ) ) {
			$entityIds = [];
		}

		$entityInfoBuilderFactory = $store->getEntityInfoBuilderFactory();
		$entityInfoBuilder = $entityInfoBuilderFactory->newEntityInfoBuilder( $entityIds );
		$entityInfoBuilder->resolveRedirects();
		$entityInfoBuilder->collectTerms(
			[ 'label', 'description' ],
			$languageFallbackChain->getFetchLanguageCodes()
		);
		$entityInfoBuilder->removeMissing();
		$entityInfoBuilder->collectDataTypes();
		$entityInfoBuilder->retainEntityInfo( $entityIds );
		$entityInfo = $entityInfoBuilder->getEntityInfo();

		$labelDescriptionLookup = new LanguageFallbackLabelDescriptionLookup(
			new EntityInfoTermLookup( $entityInfo ),
			$languageFallbackChain
		);

		$editSectionGenerator = new ToolbarEditSectionGenerator(
			new RepoSpecialPageLinker(),
			$templateFactory,
			$textProvider
		);

		$languageDirectionalityLookup = new MediaWikiLanguageDirectionalityLookup();
		$languageNameLookup = new LanguageNameLookup( $languageCode );
		$termsListView = new TermsListView(
			$templateFactory,
			$languageNameLookup,
			$textProvider,
			$languageDirectionalityLookup
		);

		$entityTermsView = new SimpleEntityTermsView(
			new FallbackHintHtmlTermRenderer(
				$languageDirectionalityLookup,
				$languageNameLookup
			),
			$labelDescriptionLookup,
			$templateFactory,
			$editSectionGenerator,
			$termsListView,
			$textProvider
		);

		$entityViewFactory = $wikibaseRepo->getEntityViewFactory();
		$entityView = $entityViewFactory->newEntityView(
			MediaInfo::ENTITY_TYPE,
			$languageCode,
			$labelDescriptionLookup,
			$languageFallbackChain,
			$editSectionGenerator,
			$entityTermsView
		);

		$html .= $entityView->getHtml( $entity );
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
	 */
	public static function onContentAlterParserOutput(
		Content $content,
		Title $title,
		ParserOutput $output
	) {
		if ( !$title->inNamespace( NS_FILE ) ) {
			return;
		}

		if ( $output->getProperty( 'mediainfo_entity' ) !== false ) {
			return;
		}

		$pageId = $title->getArticleID();
		if ( $pageId === 0 ) {
			return;
		}

		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		$entityId = $wikibaseRepo->getEntityIdComposer()->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		);

		$output->setProperty( 'mediainfo_entity', $entityId->getLocalPart() );
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
