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

	private static function newFromGlobalState() {
		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		return new self( $wikibaseRepo->getEntityIdComposer() );
	}

	/**
	 * @param EntityIdComposer $entityIdComposer
	 * @codeCoverageIgnore
	 */
	public function __construct( EntityIdComposer $entityIdComposer ) {
		$this->entityIdComposer = $entityIdComposer;
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
	 * @param string $text
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
	 * @param PropertyId $id
	 * @return string
	 * @throws \ConfigException
	 */
	public static function getValueType( PropertyId $id ) {
		$mwConfig = MediaWikiServices::getInstance()->getMainConfig();
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$propertyDataTypeLookup = $wbRepo->getPropertyDataTypeLookup();
		$dataTypes = $mwConfig->get( 'WBRepoDataTypes' );

		$propertyDatatype = $propertyDataTypeLookup->getDataTypeIdForProperty( $id );
		return $dataTypes['PT:'.$propertyDatatype]['value-type'];
	}

	/**
	 * Replace mediainfo-specific placeholders (if any), move structured data, add data and modules
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 * @throws \ConfigException
	 * @throws \OOUI\Exception
	 */
	public static function onBeforePageDisplay( $out, $skin ) {
		global $wgDepictsQualifierProperties,
				$wgMediaInfoHelpUrls,
				$wgMediaInfoProperties,
				$wgMediaInfoExternalEntitySearchBaseUri,
				$wgMediaInfoSearchFiletypes,
				$wgMediaInfoEnableSearch,
				$wgMediaInfoEnableOtherStatements;

		// Hide any MediaInfo content and UI on a page, if the target page is a redirect.
		if ( $out->getTitle()->isRedirect() ) {
			$out = self::deleteMediaInfoData( $out );
			return;
		}

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

		$properties = [];
		$qualifiers = [];
		$titles = [];
		foreach ( $wgDepictsQualifierProperties as $property ) {
			try {
				$qualifiers[$property] = static::getValueType( new PropertyId( $property ) );
			} catch ( PropertyDataTypeLookupException $e ) {
				// ignore invalid properties...
			}
		}
		foreach ( $wgMediaInfoProperties as $name => $property ) {
			try {
				// some properties/statements may have custom titles, in addition to their property
				// label, to help clarify what data is expected there
				// possible messages include:
				// wikibasemediainfo-statements-title-depicts
				$message = wfMessage( 'wikibasemediainfo-statements-title-' . ( $name ?: '' ) );
				if ( $message->exists() ) {
					$titles[$property] = $message->text();
				}

				// get data type for values associated with this property
				$properties[$property] = static::getValueType( new PropertyId( $property ) );
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
			[
				'wbmiProperties' => $properties,
				'wbmiDepictsQualifierProperties' => $qualifiers,
				'wbmiPropertyTitles' => $titles,
				'wbmiHelpUrls' => $wgMediaInfoHelpUrls,
				'wbmiExternalEntitySearchBaseUri' => $wgMediaInfoExternalEntitySearchBaseUri,
				'wbmiSearchFiletypes' => $wgMediaInfoSearchFiletypes,
				'wbmiMediaInfoEnableSearch' => $wgMediaInfoEnableSearch,
				'wbmiRepoApiUrl' => wfScript( 'api' ),
				'wbmiEnableOtherStatements' => $wgMediaInfoEnableOtherStatements,
			]
		);
	}

	/**
	 * @param \OutputPage $out
	 * @param bool $isMediaInfoPage
	 * @param string[] $termsLanguages Array with language codes as keys and autonyms as values
	 * @param UserLanguageLookup $userLanguageLookup
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @param array $jsConfigVars Variables to expose to JavaScript
	 * @throws \OOUI\Exception
	 */
	public function doBeforePageDisplay(
		$out,
		$isMediaInfoPage,
		array $termsLanguages,
		UserLanguageLookup $userLanguageLookup,
		DispatchingEntityViewFactory $entityViewFactory,
		array $jsConfigVars = []
	) {
		// Site-wide config
		$modules = [ 'wikibase.mediainfo.search' ];
		$moduleStyles = [];

		if ( $isMediaInfoPage ) {
			OutputPage::setupOOUI();
			$out = $this->tabifyStructuredData( $out, $entityViewFactory );
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
				'wbTermsLanguages' => $termsLanguages,
				'maxCaptionLength' => self::getMaxCaptionLength(),
				// FIXME: This is horrendous.
				'parsedMessageAnonEditWarning' => $out->msg(
					'anoneditwarning',
					// Log-in link
					'{{fullurl:Special:UserLogin|returnto={{FULLPAGENAMEE}}}}',
					// Sign-up link
					'{{fullurl:Special:UserLogin/signup|returnto={{FULLPAGENAMEE}}}}'
				)->parseAsBlock(),
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
	 * @throws \OOUI\Exception
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

		if ( preg_match(
			self::getMediaInfoStatementsRegex(),
			$extractedHtml['structured'],
			$matches
		) ) {
			$statements = $matches[1];
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

		// Tab 1 will be everything after (and including) <div id="mw-imagepage-content">
		// except for children of #mw-imagepage-content before .mw-parser-output (e.g. diffs)
		$tab1ContentRegex = '/(<div\b[^>]*\bid=(\'|")mw-imagepage-content\\2[^>]*>)(.*)' .
			'(<div\b[^>]*\bclass=(\'|")mw-parser-output\\5[^>]*>.*$)/is';
		// Snip out the div, and replace with a placeholder
		if (
			preg_match(
				$tab1ContentRegex,
				$extractedHtml['unstructured'],
				$matches
			)
		) {
			$tab1Html = $matches[1] . $matches[4];
			$html = preg_replace(
				$tab1ContentRegex,
				'$3<WBMI_TABS_PLACEHOLDER>',
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

		// insert captions at the beginning of Tab1
		$tab1Html = $captions . $tab1Html;

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
		return '/<' . $tag . '[^>]*>(.*)<\/' . $tag . '>/is';
	}

	private static function getMediaInfoCaptionsRegex() {
		$tag = MediaInfoEntityTermsView::CAPTIONS_CUSTOM_TAG;
		return '/<' . $tag . '>(.*)<\/' . $tag . '>/is';
	}

	private static function getMediaInfoStatementsRegex() {
		$tag = MediaInfoEntityStatementsView::STATEMENTS_CUSTOM_TAG;
		return '/<' . $tag . '>(.*)<\/' . $tag . '>/is';
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

	public static function onGetEntityContentModelForTitle( Title $title, &$contentModel ) {
		if ( $title->inNamespace( NS_FILE ) && $title->getArticleID() ) {
			$contentModel = MediaInfoContent::CONTENT_MODEL_ID;
		}
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
			$revisionRecord !== null && $revisionRecord->hasSlot( MediaInfo::ENTITY_TYPE )
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
	 * @param \User $user The user object
	 * @param array &$preferences Their preferences object
	 */
	public static function onGetPreferences( \User $user, array &$preferences ) {
		$preferences['wbmi-cc0-confirmed'] = [
			'type' => 'api'
		];

		$preferences['wbmi-wikidata-link-notice-dismissed'] = [
			'type' => 'api'
		];
	}

}
