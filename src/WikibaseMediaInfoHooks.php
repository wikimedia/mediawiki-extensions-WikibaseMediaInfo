<?php

namespace Wikibase\MediaInfo;

use AbstractContent;
use CirrusSearch\Connection;
use CirrusSearch\Search\CirrusIndexField;
use Content;
use Elastica\Document;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRoleRegistry;
use OutputPage;
use ParserOutput;
use Title;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\LanguageFallbackChainFactory;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\Lib\Store\EntityInfo;
use Wikibase\Lib\UserLanguageLookup;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
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

	const MEDIAINFO_SLOT_HEADER_PLACEHOLDER = '<mw:mediainfoslotheader />';

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
				/* content handler */ \Wikibase\MediaInfo\Content\MediaInfoContent::CONTENT_MODEL_ID
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
			$wgMediaInfoProperties;

		// Hide any MediaInfo content and UI on a page, if either …
		if (
			// the extension is disabled, or
			!MediaWikiServices::getInstance()->getMainConfig()->get( 'MediaInfoEnable' ) ||
			// the target page is a redirect.
			$out->getTitle()->isRedirect()
		) {
			$out = self::deleteMediaInfoData( $out );
			return;
		}

		$allLanguages = \Language::fetchLanguageNames();
		$termsLanguages = WikibaseRepo::getDefaultInstance()->getTermsLanguages()->getLanguages();
		$imgTitle = $out->getTitle();

		$isMediaInfoPage =
			// Check if the page exists,
			$imgTitle !== null &&
			$imgTitle->exists() &&
			// … the page is a file and
			$imgTitle->inNamespace( NS_FILE ) &&
			// … the page view is a read
			\Action::getActionName( $out->getContext() ) === 'view';

		self::newFromGlobalState()->doBeforePageDisplay(
			$out,
			$isMediaInfoPage,
			array_intersect_key(
				$allLanguages,
				array_flip( $termsLanguages )
			),
			new BabelUserLanguageLookup(),
			WikibaseRepo::getDefaultInstance()->getEntityViewFactory(),
			$wgDepictsQualifierProperties,
			$wgMediaInfoProperties
		);
	}

	/**
	 * @param \OutputPage $out
	 * @param bool $isMediaInfoPage
	 * @param string[] $termsLanguages Array with language codes as keys and autonyms as values
	 * @param UserLanguageLookup $userLanguageLookup
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @param array $depictsQualifierProperties Array of properties of allowed qualifiers
	 * 	for depicts in the format [
	 * 		[
	 * 			'id' => '<id of the property>',
	 * 			'label' => '<i8n key for the property name>',
	 * 			'input' => '<type of data the property holds - entity, numeric, text>'
	 * 		]
	 * 	]
	 * @param array $properties Property details (id, label & url)
	 */
	public function doBeforePageDisplay(
		$out,
		$isMediaInfoPage,
		array $termsLanguages,
		UserLanguageLookup $userLanguageLookup,
		DispatchingEntityViewFactory $entityViewFactory,
		array $depictsQualifierProperties,
		$properties
	) {
		// Site-wide config
		$modules = [];
		$moduleStyles = [];
		$jsConfigVars = [
			'wbmiDepictsQualifierProperties' => $depictsQualifierProperties,
			'wbmiProperties' => $properties,
		];

		if ( $isMediaInfoPage ) {
			$out = $this->moveMediaInfoData( $out, $entityViewFactory );
			$out->preventClickjacking();
			$imgTitle = $out->getTitle();
			$pageId = $imgTitle->getArticleID();
			$entityId = $this->entityIdFromPageId( $pageId );

			$modules[] = 'wikibase.mediainfo.filePageDisplay';
			$moduleStyles[] = 'wikibase.mediainfo.filepagestyles';
			$jsConfigVars += [
				'wbUserSpecifiedLanguages' => array_values(
					$userLanguageLookup->getAllUserLanguages(
						$out->getUser()
					)
				),
				'wbCurrentRevision' => $out->getWikiPage()->getRevision()->getId(),
				'wbEntityId' => $entityId->getSerialization(),
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
	private function moveMediaInfoData(
		OutputPage $out,
		DispatchingEntityViewFactory $entityViewFactory
	) {
		$html = $out->getHTML();
		$out->clearHTML();
		$html = $this->moveCaptions( $html, $out, $entityViewFactory );
		$html = $this->moveStructuredDataHeader( $html, $out );
		$out->addHTML( $html );
		return $out;
	}

	/**
	 * Move the structured data multi-lingual captions to the place we want them
	 *
	 * If there are no captions to be displayed, inject an empty MediaInfoView
	 *
	 * @param $text
	 * @param OutputPage $out
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @return string
	 */
	private function moveCaptions( $text, $out, $entityViewFactory ) {
		if ( preg_match(
			self::getMediaInfoViewRegex(),
			$text,
			$matches
		) ) {
			$captionsHtml = $matches[1];
			$text = str_replace( $matches[0], '', $text );
		} else {
			$emptyMediaInfo = new MediaInfo();
			$fallbackChainFactory = new LanguageFallbackChainFactory();
			$view = $entityViewFactory->newEntityView(
				$out->getLanguage(),
				$fallbackChainFactory->newFromLanguage( $out->getLanguage() ),
				$emptyMediaInfo,
				new EntityInfo( [] )
			);
			$captionsHtml = $view->getContent( $emptyMediaInfo )->getHtml();
			// Strip out the surrounding <mw:mediainfoView> tag
			$captionsHtml = preg_replace( self::getMediaInfoViewRegex(), '$1', $captionsHtml );
		}

		return preg_replace(
			'/<div class="mw-parser-output">/',
			'<div class="mw-parser-output">' . $captionsHtml,
			$text
		);
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
		return '/<mw:mediainfoView>(.*)<\/mw:mediainfoView>/is';
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
		// Exit if the extension is disabled.
		if ( !MediaWikiServices::getInstance()->getMainConfig()->get( 'MediaInfoEnable' ) ) {
			return;
		}
		self::newFromGlobalState()->doCirrusSearchBuildDocumentParse(
			$document,
			WikiPage::factory( $title ),
			\ContentHandler::getForModelID( MediaInfoContent::CONTENT_MODEL_ID )
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

}
