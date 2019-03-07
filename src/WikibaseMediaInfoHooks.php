<?php

namespace Wikibase\MediaInfo;

use AbstractContent;
use CirrusSearch\Connection;
use CirrusSearch\Search\CirrusIndexField;
use ContentHandler;
use Elastica\Document;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRoleRegistry;
use OOUI\HtmlSnippet;
use OOUI\IndexLayout;
use OOUI\PanelLayout;
use OOUI\TabPanelLayout;
use OutputPage;
use ParserOutput;
use Title;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\DataModel\Services\Lookup\PropertyDataTypeLookupException;
use Wikibase\LanguageFallbackChainFactory;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\Lib\Store\EntityInfo;
use Wikibase\Lib\UserLanguageLookup;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\MediaInfo\View\MediaInfoEntityStatementsView;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\Repo\BabelUserLanguageLookup;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\Repo\ParserOutput\DispatchingEntityViewFactory;
use Wikibase\Repo\Store\EntityTitleStoreLookup;
use Wikibase\Repo\WikibaseRepo;
use WikiPage;

/**
 * MediaWiki hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooks {

	const MEDIAINFO_SLOT_HEADER_PLACEHOLDER = '<mediainfoslotheader />';

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

	/**
	 * WikibaseMediaInfoHooks constructor.
	 * @param EntityIdComposer $entityIdComposer
	 * @param EntityTitleStoreLookup $entityTitleStoreLookup
	 * @codeCoverageIgnore
	 */
	public function __construct(
		EntityIdComposer $entityIdComposer,
		EntityTitleStoreLookup $entityTitleStoreLookup
	) {
		$this->entityIdComposer = $entityIdComposer;
		$this->entityTitleStoreLookup = $entityTitleStoreLookup;
	}

	/**
	 * Hook to register the MediaInfo slot role.
	 *
	 * @param MediaWikiServices $services
	 */
	public static function onMediaWikiServices( MediaWikiServices $services ) {
		$services->addServiceManipulator( 'SlotRoleRegistry', function ( SlotRoleRegistry $registry ) {
			$registry->defineRoleWithModel(
				/* role */ 'mediainfo',
				/* content handler */ MediaInfoContent::CONTENT_MODEL_ID
				/*, layout – we want to set "prepend" in future, once MediaWiki supports that */
			);
		} );
	}

	/**
	 * Hook to register the MediaInfo entity namespaces for EntityNamespaceLookup.
	 *
	 * @param array $entityNamespacesSetting
	 */
	public static function onWikibaseRepoEntityNamespaces( &$entityNamespacesSetting ) {
		// Tell Wikibase where to put our entity content.
		$entityNamespacesSetting[ MediaInfo::ENTITY_TYPE ] = NS_FILE . '/' . MediaInfo::ENTITY_TYPE;
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
	 * The placeholder mw:slotheader is replaced by default with the name of the slot
	 *
	 * Replace it with a different placeholder so we can replace it with a message later
	 * on in onBeforePageDisplay() - can't replace it here because RequestContext (and therefore
	 * the language) is not available
	 *
	 * Won't be necessary when T205444 is done
	 *
	 * @see https://phabricator.wikimedia.org/T205444
	 * @see onBeforePageDisplay()
	 *
	 * @param ParserOutput $parserOutput
	 * @param $text
	 * @param array $options
	 */
	public static function onParserOutputPostCacheTransform(
		ParserOutput $parserOutput,
		&$text,
		array $options
	) {
		$text = preg_replace(
			'#<mw:slotheader>(.*?)</mw:slotheader>#',
			self::MEDIAINFO_SLOT_HEADER_PLACEHOLDER,
			$text
		);
	}

	public static function onRegistration() {
		if ( !class_exists( \Wikibase\EntityContent::class ) ) {
			// HACK: Declaring a depency on Wikibase in extension.json requires Wikibase to have its own extension.json
			throw new \ExtensionDependencyError( [ [
				'msg' => 'WikibaseMediaInfo requires Wikibase to be installed.',
				'type' => 'missing-phpExtension',
				'missing' => 'Wikibase',
			] ] );
		}
	}

	/**
	 * Replace mediainfo-specific placeholders (if any), move structured data, add data and modules
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 */
	public static function onBeforePageDisplay( $out, $skin ) {
		global $wgDepictsQualifierProperties,
			$wgDepictsHelpUrl,
			$wgMediaInfoProperties,
			$wgMediaInfoExternalEntitySearchBaseUri,
			$wgMediaInfoEnableFilePageDepicts,
			$wgMediaInfoSearchFiletypes,
			$wgMediaInfoEnableSearch;

		// Hide any MediaInfo content and UI on a page, if the target page is a redirect.
		if ( $out->getTitle()->isRedirect() ) {
			$out = self::deleteMediaInfoData( $out );
			return;
		}

		$mwConfig = MediaWikiServices::getInstance()->getMainConfig();
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$allLanguages = \Language::fetchLanguageNames();
		$termsLanguages = $wbRepo->getTermsLanguages()->getLanguages();
		$imgTitle = $out->getTitle();

		$isMediaInfoPage =
			// Check if the page exists,
			$imgTitle !== null &&
			$imgTitle->exists() &&
			// … the page is a file and
			$imgTitle->inNamespace( NS_FILE ) &&
			// … the page view is a read
			\Action::getActionName( $out->getContext() ) === 'view';

		$dataTypes = $mwConfig->get( 'WBRepoDataTypes' );
		$qualifiers = [];
		$propertyDataTypeLookup = $wbRepo->getPropertyDataTypeLookup();
		foreach ( $wgDepictsQualifierProperties as $property ) {
			try {
				$id = new PropertyId( $property );
				$propertyDatatype = $propertyDataTypeLookup->getDataTypeIdForProperty( $id );
				$valueDataType = $dataTypes['PT:'.$propertyDatatype]['value-type'];
				$qualifiers[$property] = $valueDataType;
			} catch ( PropertyDataTypeLookupException $e ) {
				// ignore invalid properties...
			}
		}

		self::newFromGlobalState()->doBeforePageDisplay(
			$out,
			$isMediaInfoPage,
			array_intersect_key(
				$allLanguages,
				array_flip( $termsLanguages )
			),
			new BabelUserLanguageLookup(),
			$wbRepo->getEntityViewFactory(),
			$wgMediaInfoEnableFilePageDepicts,
			[
				'wbmiProperties' => $wgMediaInfoProperties,
				'wbmiDepictsQualifierProperties' => $qualifiers,
				'wbmiDepictsHelpUrl' => $wgDepictsHelpUrl,
				'wbmiExternalEntitySearchBaseUri' => $wgMediaInfoExternalEntitySearchBaseUri,
				'wbmiSearchFiletypes' => $wgMediaInfoSearchFiletypes,
				'wbmiMediaInfoEnableSearch' => $wgMediaInfoEnableSearch,
			]
		);
	}

	/**
	 * @param \OutputPage $out
	 * @param bool $isMediaInfoPage
	 * @param string[] $termsLanguages Array with language codes as keys and autonyms as values
	 * @param UserLanguageLookup $userLanguageLookup
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @param bool $showDepicts Feature flag for showing depicts statements
	 * @param array $jsConfigVars Variables to expose to JavaScript
	 */
	public function doBeforePageDisplay(
		$out,
		$isMediaInfoPage,
		array $termsLanguages,
		UserLanguageLookup $userLanguageLookup,
		DispatchingEntityViewFactory $entityViewFactory,
		$showDepicts,
		array $jsConfigVars = []
	) {
		// Site-wide config
		$modules = [ 'wikibase.mediainfo.search' ];
		$moduleStyles = [];

		if ( $isMediaInfoPage ) {
			OutputPage::setupOOUI();
			if ( $showDepicts ) {
				$out = $this->tabifyStructuredData( $out, $entityViewFactory );
			} else {
				$out = $this->moveMediaInfoCaptions( $out, $entityViewFactory );
			}
			$out->preventClickjacking();
			$imgTitle = $out->getTitle();

			$pageId = $imgTitle->getArticleID();
			$revision = $out->getWikiPage()->getRevision();
			$entityId = $this->entityIdFromPageId( $pageId );

			$wbRepo = WikibaseRepo::getDefaultInstance();
			$entityLookup = $wbRepo->getEntityLookup();
			$entityRevisionId = $entityLookup->hasEntity( $entityId ) ? $revision->getId() : null;

			$modules[] = 'wikibase.mediainfo.filePageDisplay';
			$moduleStyles[] = 'wikibase.mediainfo.filepage.styles';
			$moduleStyles[] = 'wikibase.mediainfo.statements.styles';

			$jsConfigVars += [
				'wbUserSpecifiedLanguages' => array_values(
					$userLanguageLookup->getAllUserLanguages(
						$out->getUser()
					)
				),
				'wbCurrentRevision' => $entityRevisionId,
				'wbEntityId' => $entityId->getSerialization(),
				'wbmiCaptionsExist' => $this->mediaInfoCaptionsExist( $out ),
				'wbTermsLanguages' => $termsLanguages,
				'wbRepoApiUrl' => wfScript( 'api' ),
				'maxCaptionLength' => self::getMaxCaptionLength(),
			];
		}

		$out->addJsConfigVars( $jsConfigVars );
		$out->addModuleStyles( $moduleStyles );
		$out->addModules( $modules );
	}

	/**
	 * @param OutputPage $out
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @return OutputPage $out
	 */

	private function tabifyStructuredData(
		OutputPage $out,
		DispatchingEntityViewFactory $entityViewFactory
	) {
		$html = $out->getHTML();
		$out->clearHTML();
		$textProvider = new MediaWikiLocalizedTextProvider( $out->getLanguage() );

		// Remove the slot header, as it's made redundant by the tabs
		$html = preg_replace( self::getStructuredDataHeaderRegex(), '', $html );

		// Snip out out the structured data sections ($captions, $statements)
		$extractedHtml = $this->extractStructuredDataHtml( $html, $out, $entityViewFactory );
		if ( preg_match(
			self::getMediaInfoCaptionsRegex(),
			$extractedHtml['structured'],
			$matches
		) ) {
			$captions = $matches[1];
		}
		// Deal with pages in the parser cache that don't have placeholder tags for captions
		// This can be removed once parser caches have expired (X days after this code goes live)
		if ( empty( $captions ) ) {
			if (
				preg_match(
					'/(<div[^>]*data-caption-languages.*<\/div>)\s*<\/div>\s*$/is',
					$extractedHtml['structured'],
					$matches
				)
			) {
				$captions = $matches[1];
			}
		}

		if ( preg_match(
			self::getMediaInfoStatementsRegex(),
			$extractedHtml['structured'],
			$matches
		) ) {
			$statements = $matches[1];
		}
		// Deal with pages in the parser cache that don't have placeholder tags for statements
		// This can be removed once parser caches have expired (X days after this code goes live)
		if ( empty( $statements ) ) {
			$emptyStructured = $this->createEmptyStructuredData( $out, $entityViewFactory );
			if ( preg_match(
				self::getMediaInfoStatementsRegex(),
				$emptyStructured,
				$matches
			) ) {
				$statements = $matches[1];
			}
		}

		if ( empty( $captions ) || empty( $statements ) ) {
			// Something has gone wrong - markup should have been created for empty/missing data.
			// Return the html unmodified (this should not be reachable, it's here just in case)
			$out->addHTML( $html );
			return $out;
		}

		// Add a title to statements for no-js
		$statements = \Html::rawElement(
			'h2',
			[ 'class' => 'wbmi-structured-data-header' ],
			$textProvider->get( 'wikibasemediainfo-filepage-structured-data-heading' )
		) . $statements;

		// Tab 1 will be everything inside <div id="mw-content-text"> from
		// <div id="mw-imagepage-content"> onwards ... or in other words from
		// <div id="mw-imagepage-content"> itself until the end of $html
		$tab1ContentRegex = '/' .
			'(<div\b[^>]*\bid=(\'|")mw-imagepage-content\\2[^>]*>.*)' .
			'/is';
		// Snip out the div, and replace with a placeholder
		if (
			preg_match(
				$tab1ContentRegex,
				$extractedHtml['unstructured'],
				$matches
			)
		) {
			$tab1Html = $matches[1];
			$html = preg_replace(
				$tab1ContentRegex,
				'<WBMI_TABS_PLACEHOLDER>',
				$extractedHtml['unstructured']
			);
			// Add a title for no-js
			$tab1Html = \Html::rawElement(
					'h2',
					[ 'class' => 'wbmi-captions-header' ],
					$textProvider->get( 'wikibasemediainfo-filepage-captions-title' )
				) . $tab1Html;
		} else {
			// If the div isn't found, something has gone wrong - return unmodified html
			// (this should not be reachable, it's here just in case)
			$out->addHTML( $html );
			return $out;
		}

		// inject captions into tab1
		$tab1Html = strtr(
			$tab1Html,
			[
				'<div class="mw-parser-output">' =>
					'<div class="mw-parser-output">' . $captions
			]
		);

		// Prepare tab panels
		$tab1 = new TabPanelLayout(
			'wikiTextPlusCaptions',
			[
				'classes' => [ 'wbmi-tab' ],
				'label' => $textProvider->get( 'wikibasemediainfo-filepage-fileinfo-heading' ),
				'content' => new HtmlSnippet( $tab1Html ),
				'expanded' => false,
			]
		);
		$tab2 = new TabPanelLayout(
			'statements',
			[
				'classes' => [ 'wbmi-tab' ],
				'label' => $textProvider->get( 'wikibasemediainfo-filepage-structured-data-heading' ),
				'content' => new HtmlSnippet( $statements ),
				'expanded' => false,
			]
		);
		$tabs = new IndexLayout( [
			'autoFocus' => false,
			'classes' => [ 'wbmi-tabs' ],
			'expanded' => false,
		] );
		$tabs->addTabPanels( [ $tab1, $tab2 ] );
		$tabs->setInfusable( true );

		$tabWrapper = new PanelLayout( [
			'classes' => [ 'wbmi-tabs-container' ],
			'content' => $tabs,
			'expanded' => false,
			'framed' => false,
		] );

		// Replace the placeholder with the tabs
		$html = str_replace( '<WBMI_TABS_PLACEHOLDER>', $tabWrapper, $html );

		$out->addHTML( $html );
		return $out;
	}

	private function mediaInfoCaptionsExist( OutputPage $out ) {
		$html = $out->getHTML();
		if (
			strpos( $html, '<' . MediaInfoEntityTermsView::CAPTIONS_CUSTOM_TAG . '>' ) === false
		) {
			return false;
		}
		return true;
	}

	/**
	 * @param OutputPage $out
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @return OutputPage $out
	 */
	private function moveMediaInfoCaptions(
		OutputPage $out,
		DispatchingEntityViewFactory $entityViewFactory
	) {
		$html = $out->getHTML();
		$out->clearHTML();
		$html = $this->moveStructuredData(
			$html,
			$out,
			$entityViewFactory
		);
		$html = $this->moveStructuredDataHeader( $html, $out );
		$out->addHTML( $html );
		return $out;
	}

	/**
	 * Move the structured data multi-lingual captions to just after <div class="mw-parser-output">
	 *
	 * If captions AND depicts are missing then an empty mediainfo view is injected
	 *
	 * @param string $html
	 * @param OutputPage $out
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @return string
	 */
	private function moveStructuredData(
		$html,
		OutputPage $out,
		DispatchingEntityViewFactory $entityViewFactory
	) {
		$extractedHtml = $this->extractStructuredDataHtml( $html, $out, $entityViewFactory );

		$modifiedHtml = strtr(
			$extractedHtml['unstructured'],
			[
				'<div class="mw-parser-output">' =>
					'<div class="mw-parser-output">' . $extractedHtml['structured']
			]
		);

		return $modifiedHtml;
	}

	/**
	 * Returns an array with 2 elements
	 * [
	 * 	'unstructured' => html output with structured data removed
	 *  'structured' => structured data as html ... if there is no structured data an empty
	 * 		mediainfoview is used to create the html
	 * ]
	 *
	 * @param string $html
	 * @param OutputPage $out
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @return string[]
	 */
	private function extractStructuredDataHtml(
		$html,
		OutputPage $out,
		DispatchingEntityViewFactory $entityViewFactory
	) {
		if ( preg_match(
			self::getMediaInfoViewRegex(),
			$html,
			$matches
		) ) {
			$structured = $matches[1];
			$unstructured = preg_replace( self::getMediaInfoViewRegex(), '', $html );
		} else {
			$unstructured = $html;
			$structured = $this->createEmptyStructuredData( $out, $entityViewFactory );
		}
		return [
			'unstructured' => $unstructured,
			'structured' => $structured,
		];
	}

	private function createEmptyStructuredData(
		OutputPage $out,
		DispatchingEntityViewFactory $entityViewFactory
	) {
		$emptyMediaInfo = new MediaInfo();
		$fallbackChainFactory = new LanguageFallbackChainFactory();
		$view = $entityViewFactory->newEntityView(
			$out->getLanguage(),
			$fallbackChainFactory->newFromLanguage( $out->getLanguage() ),
			$emptyMediaInfo,
			new EntityInfo( [] )
		);

		$structured = $view->getContent( $emptyMediaInfo, 0 /* EntityRevision::UNSAVED_REVISION */ )->getHtml();

		// Strip out the surrounding <mediaInfoView> tag
		$structured = preg_replace(
			self::getMediaInfoViewRegex(),
			'$1',
			$structured
		);

		return $structured;
	}

	/**
	 * Delete all MediaInfo data from the output
	 *
	 * @param OutputPage $out
	 * @return OutputPage
	 */
	private static function deleteMediaInfoData( $out ) {
		$html = $out->getHTML();
		$out->clearHTML();
		$html = preg_replace( self::getMediaInfoViewRegex(), '', $html );
		$html = preg_replace( self::getStructuredDataHeaderRegex(), '', $html );
		$out->addHTML( $html );
		return $out;
	}

	private static function getMediaInfoViewRegex() {
		$tag = MediaInfoView::MEDIAINFOVIEW_CUSTOM_TAG;
		return '/<' . $tag . '>(.*)<\/' . $tag . '>/is';
	}

	private static function getMediaInfoCaptionsRegex() {
		$tag = MediaInfoEntityTermsView::CAPTIONS_CUSTOM_TAG;

		// below $old is a workaround to process old, cached parser output
		// about a month or so after this patch got merged, below line
		// can be deleted and the commented-out below line can be used
		return '/(?|<' . $tag . '>(.*)<\/' . $tag . '>|(<div data-caption-languages.+?)<div data-statements)/is';
		// return '/<' . $tag . '>(.*)<\/' . $tag . '>/is';
	}

	private static function getMediaInfoStatementsRegex() {
		$tag = MediaInfoEntityStatementsView::STATEMENTS_CUSTOM_TAG;

		// below $old is a workaround to process old, cached parser output
		// about a month or so after this patch got merged, below line
		// can be deleted and the commented-out below line can be used
		return '/(?|<' . $tag . '>(.*)<\/' . $tag . '>|(<div data-statements.+)\s*<\/div>\s*$)/is';
		// return '/<' . $tag . '>(.*)<\/' . $tag . '>/is';
	}

	/**
	 * Move the structured data header to the place we want it
	 *
	 * Also replace the mediainfo-specific placeholder added in onParserOutputPostCacheTransform
	 *
	 * @see onParserOutputPostCacheTransform()
	 *
	 * The placeholder should no longer be necessary when T205444 is done
	 * @see https://phabricator.wikimedia.org/T205444
	 *
	 * @param $text
	 * @param OutputPage $out
	 * @return string
	 */
	private function moveStructuredDataHeader( $text, $out ) {

		// First do the move
		$header = '<h1 class="mw-slot-header">' . self::MEDIAINFO_SLOT_HEADER_PLACEHOLDER . '</h1>';
		if (
			preg_match(
				self::getStructuredDataHeaderRegex(),
				$text,
				$matches
			)
		) {
			$header = $matches[0];
			// Delete from the old place
			$text = str_replace( $header, '', $text );
		}
		// Add at the new place
		$text = preg_replace(
			'/<div class="mw-parser-output">/',
			'<div class="mw-parser-output">' . $header,
			$text
		);

		// Now replace the placeholder
		$textProvider = new MediaWikiLocalizedTextProvider( $out->getLanguage() );
		$text = str_replace(
			self::MEDIAINFO_SLOT_HEADER_PLACEHOLDER,
			htmlspecialchars(
				$textProvider->get( 'wikibasemediainfo-filepage-structured-data-heading' )
			),
			$text
		);

		return $text;
	}

	private static function getStructuredDataHeaderRegex() {
		return '#<h1\b[^>]*\bclass=(\'|")mw-slot-header\\1[^>]*>' .
			self::MEDIAINFO_SLOT_HEADER_PLACEHOLDER . '</h1>#iU';
	}

	private static function getMaxCaptionLength() {
		global $wgWBRepoSettings;
		return $wgWBRepoSettings['string-limits']['multilang']['length'];
	}

	/**
	 * The ID for a MediaInfo item is the same as the ID of its associated File page, with an
	 * 'M' prepended - this is encapsulated by EntityIdComposer::composeEntityId()
	 *
	 * @param int $pageId
	 * @return EntityId
	 */
	private function entityIdFromPageId( $pageId ) {
		return $this->entityIdComposer->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		);
	}

	public static function onGetEntityByLinkedTitleLookup( EntityByLinkedTitleLookup &$lookup ) {
		$lookup = new MediaInfoByLinkedTitleLookup( $lookup );
	}

	/**
	 * Note that this is a workaround until all slots are passed automatically to CirrusSearch
	 *
	 * @see https://phabricator.wikimedia.org/T190066
	 */
	public static function onCirrusSearchBuildDocumentParse(
		Document $document,
		Title $title,
		AbstractContent $contentObject,
		ParserOutput $parserOutput,
		Connection $connection
	) {
		self::newFromGlobalState()->doCirrusSearchBuildDocumentParse(
			$document,
			WikiPage::factory( $title ),
			ContentHandler::getForModelID( MediaInfoContent::CONTENT_MODEL_ID )
		);
	}

	public function doCirrusSearchBuildDocumentParse(
		Document $document,
		WikiPage $page,
		MediaInfoHandler $handler
	) {
		$revisionRecord = $page->getRevisionRecord();
		if (
			!is_null( $revisionRecord ) && $revisionRecord->hasSlot( MediaInfo::ENTITY_TYPE )
		) {
			/** @var SlotRecord $mediaInfoSlot */
			$mediaInfoSlot = $page->getRevisionRecord()->getSlot( MediaInfo::ENTITY_TYPE );

			$engine = new \CirrusSearch();
			$fieldDefinitions = $handler->getFieldsForSearchIndex( $engine );
			$slotData = $handler->getSlotDataForSearchIndex(
				$mediaInfoSlot->getContent()
			);
			foreach ( $slotData as $field => $fieldData ) {
				$document->set( $field, $fieldData );
				if ( isset( $fieldDefinitions[$field] ) ) {
					$hints = $fieldDefinitions[$field]->getEngineHints( $engine );
					CirrusIndexField::addIndexingHints( $document, $field, $hints );
				}
			}
		}
	}

	/**
	 * Handler for the GetPreferences hook
	 *
	 * @param User $user The user object
	 * @param array &$preferences Their preferences object
	 */
	public static function onGetPreferences( \User $user, array &$preferences ) {
		$preferences['wbmi-cc0-confirmed'] = [
			'type' => 'api'
		];
	}

}
