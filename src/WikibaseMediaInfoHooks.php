<?php

namespace Wikibase\MediaInfo;

use CirrusSearch\Parser\ParsedQueryClassifiersRepository;
use CirrusSearch\Profile\SearchProfileService;
use ExtensionRegistry;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RenderedRevision;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Revision\SlotRoleRegistry;
use MediaWiki\Storage\BlobStore;
use MediaWiki\User\UserIdentity;
use OOUI\HtmlSnippet;
use OOUI\IndexLayout;
use OOUI\PanelLayout;
use OOUI\TabPanelLayout;
use OutputPage;
use ParserOutput;
use RequestContext;
use Skin;
use Title;
use Wikibase\Client\WikibaseClient;
use Wikibase\DataModel\Entity\NumericPropertyId;
use Wikibase\DataModel\Services\Lookup\PropertyDataTypeLookupException;
use Wikibase\DataModel\Statement\StatementGuid;
use Wikibase\Lib\LanguageFallbackChainFactory;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\Lib\UserLanguageLookup;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\DataAccess\Scribunto\Scribunto_LuaWikibaseMediaInfoEntityLibrary;
use Wikibase\MediaInfo\DataAccess\Scribunto\Scribunto_LuaWikibaseMediaInfoLibrary;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Search\Feature\CustomMatchFeature;
use Wikibase\MediaInfo\Search\MediaSearchASTClassifier;
use Wikibase\MediaInfo\Search\MediaSearchQueryBuilder;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\Repo\BabelUserLanguageLookup;
use Wikibase\Repo\Content\EntityInstanceHolder;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\Repo\ParserOutput\DispatchingEntityViewFactory;
use Wikibase\Repo\WikibaseRepo;

/**
 * MediaWiki hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooks {

	public const MEDIAINFO_SLOT_HEADER_PLACEHOLDER = '<mediainfoslotheader />';

	/**
	 * Hook to register the MediaInfo slot role.
	 *
	 * @param MediaWikiServices $services
	 */
	public static function onMediaWikiServices( MediaWikiServices $services ) {
		$services->addServiceManipulator( 'SlotRoleRegistry', static function ( SlotRoleRegistry $registry ) {
			if ( !$registry->isDefinedRole( 'mediainfo' ) ) {
				// Sense check
				$registry->defineRoleWithModel(
					/* role */ 'mediainfo',
					/* content handler */ MediaInfoContent::CONTENT_MODEL_ID
					/*, layout – we want to set "prepend" in future, once MediaWiki supports that */
				);
			}
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
		$text = str_replace(
			'<mw:slotheader>mediainfo</mw:slotheader>',
			self::MEDIAINFO_SLOT_HEADER_PLACEHOLDER,
			$text
		);
	}

	public static function onRegistration() {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseRepository' ) ) {
			// HACK: Declaring a dependency on Wikibase in extension.json
			// requires more work. See T258822.
			throw new \ExtensionDependencyError( [ [
				'msg' => 'WikibaseMediaInfo requires Wikibase to be installed.',
				'type' => 'missing-phpExtension',
				'missing' => 'Wikibase',
			] ] );
		}
	}

	/**
	 * @param Title|null $title
	 * @return bool
	 */
	public static function isMediaInfoPage( Title $title = null ) {
		// Check if the page exists and the page is a file
		return $title !== null &&
			$title->exists() &&
			$title->inNamespace( NS_FILE );
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
		$config = MediaWikiServices::getInstance()->getMainConfig();

		// Hide any MediaInfo content and UI on a page, if the target page is a redirect.
		if ( $out->getTitle()->isRedirect() ) {
			$out = self::deleteMediaInfoData( $out );
			return;
		}

		$imgTitle = $out->getTitle();

		$isMediaInfoPage = static::isMediaInfoPage( $imgTitle ) &&
			// … the page view is a read
			$out->getActionName() === 'view';

		$properties = $config->get( 'MediaInfoProperties' );
		$propertyTypes = [];
		$propertyTitles = [];
		foreach ( $properties as $name => $property ) {
			try {
				// some properties/statements may have custom titles, in addition to their property
				// label, to help clarify what data is expected there
				// possible messages include:
				// wikibasemediainfo-statements-title-depicts
				$message = wfMessage( 'wikibasemediainfo-statements-title-' . ( $name ?: '' ) );
				if ( $message->exists() ) {
					$propertyTitles[$property] = $message->text();
				}

				// get data type for values associated with this property
				$propertyTypes[$property] = WBMIHooksHelper::getPropertyType( new NumericPropertyId( $property ) );
			} catch ( PropertyDataTypeLookupException $e ) {
				// ignore invalid properties...
			}
		}

		$hooksObject = new self();
		$hooksObject->doBeforePageDisplay(
			$out,
			$skin,
			$isMediaInfoPage,
			new BabelUserLanguageLookup(),
			WikibaseRepo::getEntityViewFactory(),
			[
				'wbmiDefaultProperties' => array_values( $properties ),
				'wbmiPropertyTitles' => $propertyTitles,
				'wbmiPropertyTypes' => $propertyTypes,
				'wbmiRepoApiUrl' => wfScript( 'api' ),
				'wbmiHelpUrls' => $config->get( 'MediaInfoHelpUrls' ),
				'wbmiExternalEntitySearchBaseUri' => $config->get( 'MediaInfoExternalEntitySearchBaseUri' ),
				'wbmiSupportedDataTypes' => $config->get( 'MediaInfoSupportedDataTypes' ),
			]
		);
	}

	/**
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 * @param bool $isMediaInfoPage
	 * @param UserLanguageLookup $userLanguageLookup
	 * @param DispatchingEntityViewFactory $entityViewFactory
	 * @param array $jsConfigVars Variables to expose to JavaScript
	 * @throws \OOUI\Exception
	 */
	public function doBeforePageDisplay(
		$out,
		$skin,
		$isMediaInfoPage,
		UserLanguageLookup $userLanguageLookup,
		DispatchingEntityViewFactory $entityViewFactory,
		array $jsConfigVars = []
	) {
		// Site-wide config
		$modules = [];
		$moduleStyles = [];

		if ( $isMediaInfoPage ) {
			OutputPage::setupOOUI();
			$out = $this->tabifyStructuredData( $out, $entityViewFactory );
			$out->setPreventClickjacking( true );
			$imgTitle = $out->getTitle();
			$entityId = MediaInfoServices::getMediaInfoIdLookup()->getEntityIdForTitle( $imgTitle );

			$entityLookup = WikibaseRepo::getEntityLookup();
			$entityRevisionId = $entityLookup->hasEntity( $entityId ) ? $imgTitle->getLatestRevID() : null;
			$entity = $entityLookup->getEntity( $entityId );
			$serializer = WikibaseRepo::getAllTypesEntitySerializer();
			$entityData = ( $entity ? $serializer->serialize( $entity ) : null );

			$existingPropertyTypes = [];
			if ( $entity instanceof MediaInfo ) {
				foreach ( $entity->getStatements() as $statement ) {
					$propertyId = $statement->getPropertyId();
					try {
						$existingPropertyTypes[$propertyId->serialize()] =
							WBMIHooksHelper::getPropertyType( $propertyId );
					} catch ( PropertyDataTypeLookupException $e ) {
						// ignore when property can't be found - it likely no longer exists;
						// either way, we can't find what datatype is has, so there's no
						// useful data to be gathered here
					}
					foreach ( $statement->getQualifiers() as $qualifierSnak ) {
						$qualifierPropertyId = $qualifierSnak->getPropertyId();
						try {
							$existingPropertyTypes[$qualifierPropertyId->serialize()] =
								WBMIHooksHelper::getPropertyType( $qualifierPropertyId );
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
				'wbUserSpecifiedLanguages' => $userLanguageLookup->getAllUserLanguages(
					$out->getUser()
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
				// extend/override wbmiPropertyTypes (which already contains a property type map
				// for all default properties) with property types for existing statements
				'wbmiPropertyTypes' => $jsConfigVars['wbmiPropertyTypes'] + $existingPropertyTypes,
			] );

			if ( ExtensionRegistry::getInstance()->isLoaded( 'WikibaseQualityConstraints' ) ) {
				// Don't display constraints violations unless the user is logged in and can edit
				if ( !$out->getUser()->isAnon() && $out->getUser()->probablyCan( 'edit', $imgTitle ) ) {
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
	 * @return string[] language codes as keys, autonyms as values
	 */
	public static function generateWbTermsLanguages() {
		$services = MediaWikiServices::getInstance();
		$allLanguages = $services->getLanguageNameUtils()->getLanguageNames();
		$termsLanguages = WikibaseRepo::getTermsLanguages( $services )
			->getLanguages();

		// use <code> => <name> for known languages; and add
		// <code> => <code> for all additional acceptable language
		// (that are not known to mediawiki)
		return $allLanguages + array_combine( $termsLanguages, $termsLanguages );
	}

	/**
	 * Generate the list of languages that can be used in monolingual text.
	 * This will be exposed as part of a ResourceLoader package module.
	 *
	 * @return string[] language codes as keys, autonyms as values
	 */
	public static function generateWbMonolingualTextLanguages() {
		$services = MediaWikiServices::getInstance();
		$allLanguages = $services->getLanguageNameUtils()->getLanguageNames();
		$monolingualTextLanguages = WikibaseRepo::getMonolingualTextLanguages( $services )
			->getLanguages();

		// use <code> => <name> for known languages; and add
		// <code> => <code> for all additional acceptable language
		// (that are not known to mediawiki)
		return $allLanguages + array_combine( $monolingualTextLanguages, $monolingualTextLanguages );
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
		$statements = \Html::element(
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

			// insert captions at the beginning of Tab1
			$tab1Html = $captions . $tab1Html;

			$html = preg_replace(
				$tab1ContentRegex,
				'$3<WBMI_TABS_PLACEHOLDER>',
				$extractedHtml['unstructured']
			);
			// Add a title for no-js
			$tab1Html = \Html::element(
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
			$emptyMediaInfo
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
	 * @return string|null
	 */
	private function getProtectionMsg( $out ) {
		$imgTitle = $out->getTitle();
		$msg = null;

		$services = MediaWikiServices::getInstance();
		$restrictionStore = $services->getRestrictionStore();

		// Full protection.
		if ( $restrictionStore->isProtected( $imgTitle, 'edit' ) &&
			!$restrictionStore->isSemiProtected( $imgTitle, 'edit' )
		) {
			$msg = $out->msg( 'protectedpagetext', 'editprotected', 'edit' )->parseAsBlock();
		}

		// Semi-protection.
		if ( $restrictionStore->isSemiProtected( $imgTitle, 'edit' ) ) {
			$msg = $out->msg( 'protectedpagetext', 'editsemiprotected', 'edit' )->parseAsBlock();
		}

		// Cascading protection.
		if ( $restrictionStore->isCascadeProtected( $imgTitle ) ) {
			// Get the protected page(s) causing this file to be protected.
			list( $cascadeSources ) = $restrictionStore->getCascadeProtectionSources( $imgTitle );
			$sources = '';
			$titleFormatter = $services->getTitleFormatter();
			foreach ( $cascadeSources as $pageIdentity ) {
				$sources .= '* [[:' . $titleFormatter->getPrefixedText( $pageIdentity ) . "]]\n";
			}

			$msg = $out->msg( 'cascadeprotected', count( $cascadeSources ), $sources )->parseAsBlock();
		}

		return $msg;
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
	 * Register a ProfileContext for cirrus that will mean that queries in NS_FILE will use
	 * the MediaQueryBuilder class for searching
	 *
	 * @param SearchProfileService $service
	 */
	public static function onCirrusSearchProfileService( SearchProfileService $service ) {
		global $wgWBCSUseCirrus;
		if ( !$wgWBCSUseCirrus ) {
			// avoid leaking into CirrusSearch test suite, where $wgWBCSUseCirrus
			// will be false
			return;
		}

		// Register the query builder profiles so that they are usable in interleaved A/B test
		$service->registerFileRepository( SearchProfileService::FT_QUERY_BUILDER,
			// this string is to prevent overwriting, not used for retrieval
			'mediainfo_base',
			__DIR__ . '/Search/MediaSearchProfiles.php' );

		$service->registerFileRepository( SearchProfileService::RESCORE,
			// this string is to prevent overwriting, not used for retrieval
			'mediainfo_base',
			__DIR__ . '/Search/MediaSearchRescoreProfiles.php' );

		$service->registerFileRepository( SearchProfileService::RESCORE_FUNCTION_CHAINS,
			// this string is to prevent overwriting, not used for retrieval
			'mediainfo_base',
			__DIR__ . '/Search/MediaSearchRescoreFunctionChains.php' );

		$searchProfileContextName = MediaSearchQueryBuilder::SEARCH_PROFILE_CONTEXT_NAME;
		// array key in MediaSearchProfiles.php
		$rescoreProfileName = 'classic_noboostlinks_max_boost_template';

		// Need to register a rescore profile for the profile context
		$service->registerDefaultProfile( SearchProfileService::RESCORE,
			$searchProfileContextName, $rescoreProfileName );

		$request = RequestContext::getMain()->getRequest();
		$mwServices = MediaWikiServices::getInstance();
		$config = $mwServices->getMainConfig();
		$profiles = array_keys( $config->get( 'MediaInfoMediaSearchProfiles' ) ?: [] );
		if ( $profiles ) {
			// first profile is the default mediasearch profile
			$fulltextProfileName = $profiles[0];

			foreach ( $profiles as $profile ) {
				if ( $request->getCheck( $profile ) ) {
					// switch to non-default implementations (only) when explicitly requested
					$fulltextProfileName = $profile;
				}
			}

			$service->registerDefaultProfile( SearchProfileService::FT_QUERY_BUILDER,
				$searchProfileContextName, $fulltextProfileName );

			$service->registerFTSearchQueryRoute(
				$searchProfileContextName,
				1,
				// only for NS_FILE searches
				[ NS_FILE ],
				// only when the search query is found to be something mediasearch
				// is capable of dealing with (as determined by MediaSearchASTClassifier)
				[ $fulltextProfileName ]
			);
		}
	}

	public static function onCirrusSearchRegisterFullTextQueryClassifiers(
		ParsedQueryClassifiersRepository $repository
	) {
		$mwServices = MediaWikiServices::getInstance();
		$config = $mwServices->getMainConfig();
		$profiles = array_keys( $config->get( 'MediaInfoMediaSearchProfiles' ) ?: [] );
		$repository->registerClassifier( new MediaSearchASTClassifier( $profiles ) );
	}

	/**
	 * Handler for the GetPreferences hook
	 *
	 * @param \User $user
	 * @param array[] &$preferences
	 */
	public static function onGetPreferences( \User $user, array &$preferences ) {
		$preferences['wbmi-cc0-confirmed'] = [
			'type' => 'api'
		];

		$preferences['wbmi-wikidata-link-notice-dismissed'] = [
			'type' => 'api'
		];
	}

	/**
	 * External libraries for Scribunto
	 *
	 * @param string $engine
	 * @param string[] &$extraLibraries
	 */
	public static function onScribuntoExternalLibraries( $engine, array &$extraLibraries ) {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			return;
		}
		$allowDataTransclusion = WikibaseClient::getSettings()->getSetting( 'allowDataTransclusion' );
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
		$dbw = wfGetDB( DB_PRIMARY );
		$blobStore = $mwServices->getBlobStoreFactory()->newSqlBlobStore();
		$statementGuidParser = WikibaseRepo::getStatementGuidParser( $mwServices );

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
			$existingStatementGuidString = $statement->getGuid();
			// cast GUID to non-null for Phan (we know it exists)
			'@phan-var string $existingStatementGuidString';
			$existingStatementGuid = $statementGuidParser->parse( $existingStatementGuidString );
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
		$page = MediaWikiServices::getInstance()->getWikiPageFactory()->newFromTitle( $title );
		$page->updateParserCache( [ 'causeAction' => 'mediainfo-id-splitting' ] );
	}

	/**
	 * Add Concept URI link to the toolbox section of the sidebar.
	 *
	 * @param Skin $skin
	 * @param string[] &$sidebar
	 * @return void
	 */
	public static function onSidebarBeforeOutput( Skin $skin, array &$sidebar ): void {
		$title = $skin->getTitle();
		if ( !static::isMediaInfoPage( $title ) ) {
			return;
		}

		$entityId = MediaInfoServices::getMediaInfoIdLookup()->getEntityIdForTitle( $title );
		if ( $entityId === null ) {
			return;
		}

		$baseConceptUri = WikibaseRepo::getLocalEntitySource()
			->getConceptBaseUri();

		$sidebar['TOOLBOX']['wb-concept-uri'] = [
			'id' => 't-wb-concept-uri',
			'text' => $skin->msg( 'wikibase-concept-uri' )->text(),
			'href' => $baseConceptUri . $entityId->getSerialization(),
			'title' => $skin->msg( 'wikibase-concept-uri-tooltip' )->text()
		];
	}

	/**
	 * Add extra cirrus search query features for wikibase
	 *
	 * @param \CirrusSearch\SearchConfig $config (not used, required by hook)
	 * @param array &$extraFeatures
	 */
	public static function onCirrusSearchAddQueryFeatures( $config, array &$extraFeatures ) {
		$featureConfig = MediaWikiServices::getInstance()->getMainConfig()
			->get( 'MediaInfoCustomMatchFeature' );
		if ( $featureConfig ) {
			$extraFeatures[] = new CustomMatchFeature( $featureConfig );
		}
	}

	/**
	 * @param RenderedRevision $renderedRevision
	 * @param UserIdentity $author
	 * @param \CommentStoreComment $summary
	 * @param int $flags
	 * @param \Status $hookStatus
	 */
	public static function onMultiContentSave(
		RenderedRevision $renderedRevision,
		UserIdentity $author,
		\CommentStoreComment $summary,
		int $flags,
		\Status $hookStatus
	) {
		if ( ( $flags & EDIT_AUTOSUMMARY ) !== 0 && $renderedRevision->getRevision()->hasSlot( 'mediainfo' ) ) {
			// remove coordinates from edit summaries when deleting location statements
			// @see https://phabricator.wikimedia.org/T298700
			$coordinate = '\d+°(\d+\'(\d+(\.\d+)?")?)?';
			$summary->text = preg_replace(
				"/(\/\* wbremoveclaims-remove:.+? \*\/ .+?): {$coordinate}[NS], {$coordinate}[EW]/u",
				'$1',
				$summary->text
			);
		}
	}
}
