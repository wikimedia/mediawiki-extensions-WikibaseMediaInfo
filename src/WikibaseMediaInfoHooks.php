<?php

namespace Wikibase\MediaInfo;

use AbstractContent;
use CirrusSearch\CirrusSearch;
use CirrusSearch\Connection;
use CirrusSearch\Search\CirrusIndexField;
use Config;
use ContentHandler;
use Elastica\Document;
use Language;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRoleRegistry;
use MediaWiki\Storage\BlobStore;
use OOUI\HtmlSnippet;
use OOUI\IndexLayout;
use OOUI\PanelLayout;
use OOUI\TabPanelLayout;
use OutputPage;
use ParserOutput;
use ResourceLoaderContext;
use Title;
use Wikibase\Client\WikibaseClient;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\Lookup\PropertyDataTypeLookupException;
use Wikibase\DataModel\Statement\StatementGuid;
use Wikibase\Lib\LanguageFallbackChainFactory;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\Lib\Store\EntityInfo;
use Wikibase\Lib\UserLanguageLookup;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataAccess\Scribunto\Scribunto_LuaWikibaseMediaInfoEntityLibrary;
use Wikibase\MediaInfo\DataAccess\Scribunto\Scribunto_LuaWikibaseMediaInfoLibrary;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\Repo\BabelUserLanguageLookup;
use Wikibase\Repo\Content\EntityContent;
use Wikibase\Repo\Content\EntityInstanceHolder;
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
	 * @param int[] &$entityNamespacesSetting
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
	 * @note This is bootstrap code, it is executed for EVERY request. Avoid instantiating
	 * objects or loading classes here!
	 *
	 * @param array[] &$entityTypeDefinitions
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
	 * @param string &$text
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
		if ( !class_exists( EntityContent::class ) ) {
			// HACK: Declaring a dependency on Wikibase in extension.json requires Wikibase to have its own extension.json
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
	 * @throws \ConfigException
	 * @throws \OOUI\Exception
	 */
	public static function onBeforePageDisplay( $out, $skin ) {
		global $wgMediaInfoHelpUrls,
				$wgMediaInfoProperties,
				$wgMediaInfoExternalEntitySearchBaseUri,
				$wgMediaInfoEnableSearch,
				$wgMediaInfoSupportedDataTypes;

		// Hide any MediaInfo content and UI on a page, if the target page is a redirect.
		if ( $out->getTitle()->isRedirect() ) {
			$out = self::deleteMediaInfoData( $out );
			return;
		}

		$wbRepo = WikibaseRepo::getDefaultInstance();
		$imgTitle = $out->getTitle();

		$isMediaInfoPage =
			// Check if the page exists,
			$imgTitle !== null &&
			$imgTitle->exists() &&
			// … the page is a file and
			$imgTitle->inNamespace( NS_FILE ) &&
			// … the page view is a read
			\Action::getActionName( $out->getContext() ) === 'view';

		$propertyTypes = [];
		$propertyTitles = [];
		$searchTitles = [];
		foreach ( $wgMediaInfoProperties as $name => $property ) {
			try {
				// some properties/statements may have custom titles, in addition to their property
				// label, to help clarify what data is expected there
				// possible messages include:
				// wikibasemediainfo-statements-title-depicts
				$message = wfMessage( 'wikibasemediainfo-statements-title-' . ( $name ?: '' ) );
				if ( $message->exists() ) {
					$propertyTitles[$property] = $message->text();
				}

				$message = wfMessage( 'wikibasemediainfo-search-suggestions-title-' . ( $name ?: '' ) );
				if ( $message->exists() ) {
					$searchTitles[$property] = $message->text();
				}

				// get data type for values associated with this property
				$propertyTypes[$property] = WBMIHooksHelper::getPropertyType( new PropertyId( $property ) );
			} catch ( PropertyDataTypeLookupException $e ) {
				// ignore invalid properties...
			}
		}

		$hooksObject = new self();
		$hooksObject->doBeforePageDisplay(
			$out,
			$isMediaInfoPage,
			new BabelUserLanguageLookup(),
			$wbRepo->getEntityViewFactory(),
			[
				'wbmiDefaultProperties' => array_values( $wgMediaInfoProperties ),
				'wbmiPropertyTitles' => $propertyTitles,
				'wbmiPropertyTypes' => $propertyTypes,
				'wbmiSearchTitles' => $searchTitles,
				'wbmiHelpUrls' => $wgMediaInfoHelpUrls,
				'wbmiExternalEntitySearchBaseUri' => $wgMediaInfoExternalEntitySearchBaseUri,
				'wbmiMediaInfoEnableSearch' => $wgMediaInfoEnableSearch,
				'wbmiRepoApiUrl' => wfScript( 'api' ),
				'wbmiSupportedDataTypes' => $wgMediaInfoSupportedDataTypes,
			]
		);
	}

	/**
	 * @param \OutputPage $out
	 * @param bool $isMediaInfoPage
	 * @param UserLanguageLookup $userLanguageLookup
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @param array $jsConfigVars Variables to expose to JavaScript
	 * @throws \OOUI\Exception
	 */
	public function doBeforePageDisplay(
		$out,
		$isMediaInfoPage,
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

			$revRecord = $out->getWikiPage()->getRevisionRecord();
			$entityId = MediaInfoServices::getMediaInfoIdLookup()->getEntityIdForTitle( $imgTitle );

			$wbRepo = WikibaseRepo::getDefaultInstance();
			$entityLookup = $wbRepo->getEntityLookup();
			$entityRevisionId = $entityLookup->hasEntity( $entityId ) ? $revRecord->getId() : null;
			$entity = $entityLookup->getEntity( $entityId );
			$serializer = $wbRepo->getAllTypesEntitySerializer();
			$entityData = ( $entity ? $serializer->serialize( $entity ) : null );

			$existingPropertyTypes = [];
			if ( $entity instanceof MediaInfo ) {
				foreach ( $entity->getStatements() as $statement ) {
					$propertyId = $statement->getPropertyId();
					try {
						$existingPropertyTypes[$propertyId->serialize()] = WBMIHooksHelper::getPropertyType( $propertyId );
					} catch ( PropertyDataTypeLookupException $e ) {
						// ignore when property can't be found - it likely no longer exists;
						// either way, we can't find what datatype is has, so there's no
						// useful data to be gathered here
					}
					foreach ( $statement->getQualifiers() as $qualifierSnak ) {
						$qualifierPropertyId = $qualifierSnak->getPropertyId();
						try {
							$existingPropertyTypes[$qualifierPropertyId->serialize()] = WBMIHooksHelper::getPropertyType( $qualifierPropertyId );
						} catch ( PropertyDataTypeLookupException $e ) {
							// ignore when property can't be found - it likely no longer exists;
							// either way, we can't find what datatype is has, so there's no
							// useful data to be gathered here
						}
					}
				}
			}

			$modules[] = 'wikibase.mediainfo.filePageDisplay';
			$moduleStyles[] = 'wikibase.mediainfo.filepage.styles';
			$moduleStyles[] = 'wikibase.mediainfo.statements.styles';

			$jsConfigVars = array_merge( $jsConfigVars, [
				'wbUserSpecifiedLanguages' => array_values(
					$userLanguageLookup->getAllUserLanguages(
						$out->getUser()
					)
				),
				'wbCurrentRevision' => $entityRevisionId,
				'wbEntityId' => $entityId->getSerialization(),
				'wbEntity' => $entityData,
				'wbmiMinCaptionLength' => 5,
				'wbmiMaxCaptionLength' => WBMIHooksHelper::getMaxCaptionLength(),
				'wbmiParsedMessageAnonEditWarning' => $out->msg(
					'anoneditwarning',
					// Log-in link
					'{{fullurl:Special:UserLogin|returnto={{FULLPAGENAMEE}}}}',
					// Sign-up link
					'{{fullurl:Special:UserLogin/signup|returnto={{FULLPAGENAMEE}}}}'
				)->parseAsBlock(),
				'wbmiProtectionMsg' => $this->getProtectionMsg( $out ),
				'wbmiUserCanEdit' => $this->userCanEdit( $out ),
				// extend/override wbmiPropertyTypes (which already contains a property type map
				// for all default properties) with property types for existing statements
				'wbmiPropertyTypes' => $jsConfigVars['wbmiPropertyTypes'] + $existingPropertyTypes,
			] );

			if ( \ExtensionRegistry::getInstance()->isLoaded( 'WikibaseQualityConstraints' ) ) {
				if ( !$out->getUser()->isAnon() && $this->userCanEdit( $out ) ) {
					$modules[] = 'wikibase.quality.constraints.ui';
					$modules[] = 'wikibase.quality.constraints.icon';
					$jsConfigVars['wbmiDoConstraintCheck'] = true;
				}
			}
		}

		$out->addJsConfigVars( $jsConfigVars );
		$out->addModuleStyles( $moduleStyles );
		$out->addModules( $modules );
	}

	/**
	 * Generate the list of languages that can be used in terms.
	 * This will be exposed as part of a ResourceLoader package module.
	 *
	 * @param ResourceLoaderContext $context
	 * @param Config $config
	 * @return array language codes as keys, autonyms as values
	 */
	public static function generateWbTermsLanguages( ResourceLoaderContext $context, Config $config ) {
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$allLanguages = Language::fetchLanguageNames();
		$termsLanguages = $wbRepo->getTermsLanguages()->getLanguages();
		return array_intersect_key(
			$allLanguages,
			array_flip( $termsLanguages )
		);
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
		$html = preg_replace( WBMIHooksHelper::getStructuredDataHeaderRegex(), '', $html );

		// Snip out out the structured data sections ($captions, $statements)
		$extractedHtml = $this->extractStructuredDataHtml( $html, $out, $entityViewFactory );
		if ( preg_match(
			WBMIHooksHelper::getMediaInfoCaptionsRegex(),
			$extractedHtml['structured'],
			$matches
		) ) {
			$captions = $matches[1];
		}

		if ( preg_match(
			WBMIHooksHelper::getMediaInfoStatementsRegex(),
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
			'framed' => false,
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
			WBMIHooksHelper::getMediaInfoViewRegex(),
			$html,
			$matches
		) ) {
			$structured = $matches[1];
			$unstructured = preg_replace(
				WBMIHooksHelper::getMediaInfoViewRegex(),
				'',
				$html
			);
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

		$structured = $view->getContent(
			$emptyMediaInfo,
			/* EntityRevision::UNSAVED_REVISION */
			0
			)->getHtml();

		// Strip out the surrounding <mediaInfoView> tag
		$structured = preg_replace(
			WBMIHooksHelper::getMediaInfoViewRegex(),
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
		$html = preg_replace( WBMIHooksHelper::getMediaInfoViewRegex(), '', $html );
		$html = preg_replace( WBMIHooksHelper::getStructuredDataHeaderRegex(), '', $html );
		$out->addHTML( $html );
		return $out;
	}

	/**
	 * If this file is protected, get the appropriate message for the user.
	 *
	 * Passing the message HTML to JS may not be ideal, but some messages are
	 * templates and template syntax isn't supported in JS. See
	 * https://www.mediawiki.org/wiki/Manual:Messages_API#Using_messages_in_JavaScript.
	 *
	 * @param OutputPage $out
	 * @return string|NULL
	 */
	private function getProtectionMsg( $out ) {
		$imgTitle = $out->getTitle();
		$msg = null;

		// Full protection.
		if ( $imgTitle->isProtected( 'edit' ) && !$imgTitle->isSemiProtected( 'edit' ) ) {
			$msg = $out->msg( 'protectedpagetext', 'editprotected', 'edit' )->parseAsBlock();
		}

		// Semi-protection.
		if ( $imgTitle->isSemiProtected( 'edit' ) ) {
			$msg = $out->msg( 'protectedpagetext', 'editsemiprotected', 'edit' )->parseAsBlock();
		}

		// Cascading protection.
		if ( $imgTitle->isCascadeProtected() ) {
			// Get the protected page(s) causing this file to be protected.
			list( $cascadeSources ) = $imgTitle->getCascadeProtectionSources() ?: [];
			$sources = '';
			foreach ( $cascadeSources as $page ) {
				$sources .= '* [[:' . $page->getPrefixedText() . "]]\n";
			}

			$msg = $out->msg( 'cascadeprotected', count( $cascadeSources ), $sources )->parseAsBlock();
		}

		return $msg;
	}

	/**
	 * Return whether or not a user can edit captions and structured data.
	 *
	 * @param OutputPage $out
	 * @return bool
	 */
	private function userCanEdit( $out ) {
		$user = $out->getUser();
		$groups = $user->getGroups();
		$isAnon = $user->isAnon();
		$imgTitle = $out->getTitle();

		// 1. Admins can always edit.
		// 2. Anyone can edit non-protected pages (isProtected covers full and
		//    semi-protection).
		// 3. Authenticated users can edit semi-protected pages.
		if (
			in_array( 'sysop', $groups ) ||
			!$imgTitle->isProtected( 'edit' ) && !$imgTitle->isCascadeProtected() ||
			$imgTitle->isSemiProtected( 'edit' ) && !$isAnon
		) {
			return true;
		}

		return false;
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
	 *
	 * @param Document $document The modifiable Elastica page
	 * @param Title $title The Title for the page
	 * @param AbstractContent $contentObject The Content object for the page
	 * @param ParserOutput|null $parserOutput The ParserOutput for the page if it exists
	 * @param Connection $connection
	 */
	public static function onCirrusSearchBuildDocumentParse(
		Document $document,
		Title $title,
		AbstractContent $contentObject,
		ParserOutput $parserOutput,
		Connection $connection
	) {
		$hooksObject = new self();
		$hooksObject->doCirrusSearchBuildDocumentParse(
			$document,
			WikiPage::factory( $title ),
			// @phan-suppress-next-line PhanTypeMismatchArgument It is a MediaInfoHandler
			ContentHandler::getForModelID( MediaInfoContent::CONTENT_MODEL_ID )
		);
	}

	public function doCirrusSearchBuildDocumentParse(
		Document $document,
		WikiPage $page,
		MediaInfoHandler $handler
	) {
		if ( $page->getTitle()->getNamespace() !== NS_FILE ) {
			return;
		}
		$revisionRecord = $page->getRevisionRecord();
		if (
			$revisionRecord === null || !$revisionRecord->hasSlot( MediaInfo::ENTITY_TYPE )
		) {
			$content = MediaInfoContent::emptyContent();
		} else {
			/** @var SlotRecord $mediaInfoSlot */
			$mediaInfoSlot = $page->getRevisionRecord()->getSlot( MediaInfo::ENTITY_TYPE );
			$content = $mediaInfoSlot->getContent();
		}

		$engine = new CirrusSearch();
		$fieldDefinitions = $handler->getFieldsForSearchIndex( $engine );
		$slotData = $handler->getSlotDataForSearchIndex( $content );

		foreach ( $slotData as $field => $fieldData ) {
			$document->set( $field, $fieldData );
			if ( isset( $fieldDefinitions[$field] ) ) {
				$hints = $fieldDefinitions[$field]->getEngineHints( $engine );
				CirrusIndexField::addIndexingHints( $document, $field, $hints );
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

		$preferences['wbmi-search-suggestions'] = [
			'type' => 'toggle',
			'section' => 'searchoptions',
			'label-message' => 'wikibasemediainfo-search-suggestions-preference-label'
		];
	}

	/**
	 * External libraries for Scribunto
	 *
	 * @param string $engine
	 * @param string[] &$extraLibraries
	 */
	public static function onScribuntoExternalLibraries( $engine, array &$extraLibraries ) {
		$wbClient = WikibaseClient::getDefaultInstance();
		$allowDataTransclusion = $wbClient->getSettings()->getSetting( 'allowDataTransclusion' );
		if ( $engine === 'lua' && $allowDataTransclusion === true ) {
			$extraLibraries['mw.wikibase.mediainfo'] = Scribunto_LuaWikibaseMediaInfoLibrary::class;
			$extraLibraries['mw.wikibase.mediainfo.entity'] = [
				'class' => Scribunto_LuaWikibaseMediaInfoEntityLibrary::class,
				'deferLoad' => true,
			];
		}
	}

	/**
	 * @param RevisionRecord $revision
	 */
	public static function onRevisionUndeleted( RevisionRecord $revision ) {
		$title = Title::newFromLinkTarget( $revision->getPageAsLinkTarget() );
		if ( !$title->inNamespace( NS_FILE ) ) {
			// short-circuit if we're not even dealing with a file
			return;
		}

		if ( !$revision->hasSlot( 'mediainfo' ) ) {
			// no mediainfo content found
			return;
		}

		$mwServices = MediaWikiServices::getInstance();
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$dbw = wfGetDB( DB_MASTER );
		$blobStore = $mwServices->getBlobStoreFactory()->newSqlBlobStore();
		$statementGuidParser = $wbRepo->getStatementGuidParser();

		// fetch existing entity data from old revision
		$slot = $revision->getSlot( 'mediainfo', RevisionRecord::RAW );
		$existingContentId = $slot->getContentId();
		$existingContent = $slot->getContent();
		if ( !( $existingContent instanceof MediaInfoContent ) ) {
			return;
		}
		$existingEntity = $existingContent->getEntity();
		$existingEntityId = $existingEntity->getId();

		// generate actual correct entity id for this title
		$entityIdLookup = MediaInfoServices::getMediaInfoIdLookup();
		$newEntityId = $entityIdLookup->getEntityIdForTitle( $title );
		if ( $existingEntityId === null || $newEntityId === null || $existingEntityId->equals( $newEntityId ) ) {
			return;
		}

		// create new content object with the same content, but this id
		$newEntity = $existingEntity->copy();
		$newEntity->setId( $newEntityId );
		foreach ( $newEntity->getStatements()->toArray() as $statement ) {
			// statement GUIDs also contain the M-id, so let's go fix those too
			$existingStatementGuid = $statementGuidParser->parse( $statement->getGuid() );
			if ( !$newEntityId->equals( $existingStatementGuid->getEntityId() ) ) {
				$newStatementGuid = new StatementGuid( $newEntityId, $existingStatementGuid->getGuidPart() );
				$statement->setGuid( (string)$newStatementGuid );
			}
		}
		$newContent = new MediaInfoContent( new EntityInstanceHolder( $newEntity ) );

		// store updated content in blob store
		$unsavedSlot = SlotRecord::newUnsaved( 'mediainfo', $newContent );
		$blobAddress = $blobStore->storeBlob(
			$newContent->serialize( $newContent->getDefaultFormat() ),
			[
				BlobStore::PAGE_HINT => $revision->getPageId(),
				BlobStore::REVISION_HINT => $revision->getId(),
				BlobStore::PARENT_HINT => $revision->getParentId(),
				BlobStore::DESIGNATION_HINT => 'page-content',
				BlobStore::ROLE_HINT => $unsavedSlot->getRole(),
				BlobStore::SHA1_HINT => $unsavedSlot->getSha1(),
				BlobStore::MODEL_HINT => $newContent->getModel(),
				BlobStore::FORMAT_HINT => $newContent->getDefaultFormat(),
			]
		);

		// update content record to point to new, corrected, content blob
		$dbw->update(
			'content',
			[
				'content_size' => $unsavedSlot->getSize(),
				'content_sha1' => $unsavedSlot->getSha1(),
				'content_address' => $blobAddress,
			],
			[
				'content_id' => $existingContentId,
			],
			__METHOD__
		);
	}

	/**
	 * @param Title $title
	 * @param bool $create
	 * @param string $comment
	 * @param int $oldPageId
	 * @param array $restoredPages
	 */
	public static function onArticleUndelete( Title $title, $create, $comment, $oldPageId, array $restoredPages ) {
		if ( !$title->inNamespace( NS_FILE ) || $oldPageId === $title->getArticleID() ) {
			return;
		}

		// above onArticleRevisionUndeleted hook has been fixing MediaInfo ids
		// for every undeleted revision, but now that that process is done, we
		// need to clear the parser caches that (may have) been created during
		// the undelete process as they were based on incorrect entities
		$page = WikiPage::factory( $title );
		$page->updateParserCache( [ 'causeAction' => 'mediainfo-id-splitting' ] );
	}

}
