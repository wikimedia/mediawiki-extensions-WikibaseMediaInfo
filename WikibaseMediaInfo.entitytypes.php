<?php

/**
 * Definition of the media info entity type.
 * The array returned by the code below is supposed to be merged into $wgWBRepoEntityTypes.
 *
 * @note: Keep in sync with Wikibase
 *
 * @note: This is bootstrap code, it is executed for EVERY request. Avoid instantiating
 * objects or loading classes here!
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */

use MediaWiki\MediaWikiServices;
use Wikibase\DataAccess\EntitySource;
use Wikibase\DataModel\Deserializers\DeserializerFactory;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\NumericPropertyId;
use Wikibase\DataModel\Entity\SerializableEntityId;
use Wikibase\DataModel\Serializers\SerializerFactory;
use Wikibase\DataModel\Services\EntityId\EntityIdFormatter;
use Wikibase\DataModel\Services\Lookup\InProcessCachingDataTypeLookup;
use Wikibase\Lib\DataTypeDefinitions;
use Wikibase\Lib\EntityTypeDefinitions;
use Wikibase\Lib\EntityTypeDefinitions as Def;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\Lib\SettingsArray;
use Wikibase\Lib\Store\CachingPropertyOrderProvider;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\Sql\WikiPageEntityDataLoader;
use Wikibase\Lib\Store\Sql\WikiPageEntityMetaDataLookup;
use Wikibase\Lib\Store\TitleLookupBasedEntityExistenceChecker;
use Wikibase\Lib\Store\TitleLookupBasedEntityRedirectChecker;
use Wikibase\Lib\Store\TitleLookupBasedEntityTitleTextLookup;
use Wikibase\Lib\Store\TitleLookupBasedEntityUrlLookup;
use Wikibase\Lib\Store\WikiPagePropertyOrderProvider;
use Wikibase\Lib\TermLanguageFallbackChain;
use Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\DataAccess\Store\EntityIdFixingRevisionLookup;
use Wikibase\MediaInfo\DataAccess\Store\FilePageRedirectHandlingRevisionLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoDiffer;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoPatcher;
use Wikibase\MediaInfo\Diff\BasicMediaInfoDiffVisualizer;
use Wikibase\MediaInfo\Rdf\MediaInfoRdfBuilder;
use Wikibase\MediaInfo\Rdf\MediaInfoSpecificComponentsRdfBuilder;
use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\MediaInfo\Services\MediaInfoEntityQuery;
use Wikibase\MediaInfo\Services\MediaInfoPrefetchingTermLookup;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\MediaInfo\View\MediaInfoEntityStatementsView;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\Repo\Diff\ClaimDiffer;
use Wikibase\Repo\Diff\ClaimDifferenceVisualizer;
use Wikibase\Repo\MediaWikiLanguageDirectionalityLookup;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\Repo\Rdf\DedupeBag;
use Wikibase\Repo\Rdf\EntityMentionListener;
use Wikibase\Repo\Rdf\FullStatementRdfBuilderFactory;
use Wikibase\Repo\Rdf\RdfVocabulary;
use Wikibase\Repo\Rdf\TermsRdfBuilder;
use Wikibase\Repo\Rdf\TruthyStatementRdfBuilderFactory;
use Wikibase\Repo\Rdf\ValueSnakRdfBuilderFactory;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\StatementProviderFieldDefinitions;
use Wikimedia\Purtle\RdfWriter;

return [
	MediaInfo::ENTITY_TYPE => [
		Def::STORAGE_SERIALIZER_FACTORY_CALLBACK => static function ( SerializerFactory $serializerFactory ) {
			return new MediaInfoSerializer(
				$serializerFactory->newTermListSerializer(),
				$serializerFactory->newStatementListSerializer()
			);
		},
		Def::SERIALIZER_FACTORY_CALLBACK => static function ( SerializerFactory $serializerFactory ) {
			return new MediaInfoSerializer(
				$serializerFactory->newTermListSerializer(),
				$serializerFactory->newStatementListSerializer()
			);
		},
		Def::DESERIALIZER_FACTORY_CALLBACK => static function ( DeserializerFactory $deserializerFactory ) {
			return new MediaInfoDeserializer(
				$deserializerFactory->newEntityIdDeserializer(),
				$deserializerFactory->newTermListDeserializer(),
				$deserializerFactory->newStatementListDeserializer()
			);
		},
		Def::VIEW_FACTORY_CALLBACK => static function (
			Language $language,
			TermLanguageFallbackChain $termFallbackChain,
			EntityDocument $entity
		) {
			$mwConfig = MediaWikiServices::getInstance()->getMainConfig();
			$languageCode = $language->getCode();

			// Use a MediaInfo-specific EntityTermsView class instead of the default one
			$langDirLookup = new MediaWikiLanguageDirectionalityLookup();
			$textProvider = new MediaWikiLocalizedTextProvider( $language );
			$mediaInfoEntityTermsView = new MediaInfoEntityTermsView(
				new LanguageNameLookup( $languageCode ),
				$langDirLookup,
				$textProvider,
				$termFallbackChain
			);

			// Use a MediaInfo-specific EntityStatementView class
			$propertyOrderProvider = new CachingPropertyOrderProvider(
				new WikiPagePropertyOrderProvider(
					MediaWikiServices::getInstance()->getWikiPageFactory(),
					Title::newFromText( 'MediaWiki:Wikibase-SortedProperties' )
				),
				ObjectCache::getLocalClusterInstance()
			);

			$defaultPropertyIdsForView = [];
			$properties = $mwConfig->get( 'MediaInfoProperties' ) ?? [];
			foreach ( $properties as $propertyId ) {
				$defaultPropertyIdsForView[] = new NumericPropertyId( $propertyId );
			}

			$statementsView = new MediaInfoEntityStatementsView(
				$propertyOrderProvider,
				$textProvider,
				$defaultPropertyIdsForView,
				WikibaseRepo::getSnakFormatterFactory(),
				WikibaseRepo::getValueFormatterFactory(),
				WikibaseRepo::getBaseDataModelSerializerFactory(),
				$languageCode,
				$properties
			);

			return new MediaInfoView(
				$mediaInfoEntityTermsView,
				$languageCode,
				$statementsView
			);
		},
		Def::CONTENT_MODEL_ID => MediaInfoContent::CONTENT_MODEL_ID,
		Def::SEARCH_FIELD_DEFINITIONS => static function ( array $languageCodes, SettingsArray $searchSettings ) {
			$services = MediaWikiServices::getInstance();
			$config = $services->getConfigFactory()->makeConfig( 'WikibaseCirrusSearch' );
			return new MediaInfoFieldDefinitions(
				new LabelsProviderFieldDefinitions( $languageCodes ),
				new DescriptionsProviderFieldDefinitions( $languageCodes,
					$config->get( 'UseStemming' ) ),
				StatementProviderFieldDefinitions::newFromSettings(
					new InProcessCachingDataTypeLookup(
						WikibaseRepo::getPropertyDataTypeLookup( $services ) ),
					WikibaseRepo::getDataTypeDefinitions( $services )
						->getSearchIndexDataFormatterCallbacks(),
					$searchSettings
				)
			);
		},
		Def::CONTENT_HANDLER_FACTORY_CALLBACK => static function () {
			return MediaInfoServices::getMediaInfoHandler();
		},
		Def::ENTITY_ID_PATTERN => MediaInfoId::PATTERN,
		Def::ENTITY_ID_BUILDER => static function ( $serialization ) {
			return new MediaInfoId( $serialization );
		},
		Def::ENTITY_ID_COMPOSER_CALLBACK => static function ( $repositoryName, $uniquePart ) {
			return new MediaInfoId( SerializableEntityId::joinSerialization( [
				$repositoryName,
				'',
				'M' . $uniquePart
			] ) );
		},
		Def::ENTITY_DIFFER_STRATEGY_BUILDER => static function () {
			return new MediaInfoDiffer();
		},
		Def::ENTITY_PATCHER_STRATEGY_BUILDER => static function () {
			return new MediaInfoPatcher();
		},
		Def::ENTITY_FACTORY_CALLBACK => static function () {
			return new MediaInfo();
		},

		// Identifier of a resource loader module that, when `require`d, returns a function
		// returning a deserializer
		Def::JS_DESERIALIZER_FACTORY_FUNCTION => 'wikibase.mediainfo.getDeserializer',
		Def::CHANGEOP_DESERIALIZER_CALLBACK => static function () {
			$changeOpDeserializerFactory = WikibaseRepo::getChangeOpDeserializerFactory();

			return new MediaInfoChangeOpDeserializer(
				$changeOpDeserializerFactory->getLabelsChangeOpDeserializer(),
				$changeOpDeserializerFactory->getDescriptionsChangeOpDeserializer(),
				$changeOpDeserializerFactory->getClaimsChangeOpDeserializer()
			);
		},
		Def::ENTITY_DIFF_VISUALIZER_CALLBACK => static function (
			MessageLocalizer $messageLocalizer,
			ClaimDiffer $claimDiffer,
			ClaimDifferenceVisualizer $claimDiffView,
			SiteLookup $siteLookup,
			EntityIdFormatter $entityIdFormatter
		) {
			return new BasicMediaInfoDiffVisualizer(
				$messageLocalizer,
				$claimDiffer,
				$claimDiffView
			);
		},
		Def::ENTITY_METADATA_ACCESSOR_CALLBACK => static function ( $dbName, $repoName ) {
			$entityNamespaceLookup = WikibaseRepo::getEntityNamespaceLookup();
			$entityQuery = new MediaInfoEntityQuery(
				$entityNamespaceLookup,
				MediaWikiServices::getInstance()->getSlotRoleStore()
			);

			$entitySource = WikibaseRepo::getEntitySourceDefinitions()
				->getDatabaseSourceForEntityType( MediaInfo::ENTITY_TYPE );

			return new WikiPageEntityMetaDataLookup(
				$entityNamespaceLookup,
				$entityQuery,
				$entitySource,
				WikibaseRepo::getRepoDomainDbFactory()->newForEntitySource( $entitySource ),
				WikibaseRepo::getLogger()
			);
		},
		Def::RDF_BUILDER_FACTORY_CALLBACK => static function (
			$flavorFlags,
			RdfVocabulary $vocabulary,
			RdfWriter $writer,
			EntityMentionListener $tracker,
			DedupeBag $dedupe
		) {
			$services = MediaWikiServices::getInstance();

			$entityTypeDefinitions = WikibaseRepo::getEntityTypeDefinitions( $services );
			$termsRdfBuilder = new TermsRdfBuilder(
				$vocabulary,
				$writer,
				$entityTypeDefinitions->get( EntityTypeDefinitions::RDF_LABEL_PREDICATES )
			);

			$propertyDataLookup = WikibaseRepo::getPropertyDataTypeLookup();
			$valueSnakRdfBuilderFactory = new ValueSnakRdfBuilderFactory(
				WikibaseRepo::getDataTypeDefinitions( $services )
					->getRdfBuilderFactoryCallbacks( DataTypeDefinitions::PREFIXED_MODE ),
				WikibaseRepo::getLogger( $services )
			);
			$truthyStatementRdfBuilderFactory = new TruthyStatementRdfBuilderFactory(
				$dedupe,
				$vocabulary,
				$writer,
				$valueSnakRdfBuilderFactory,
				$tracker,
				$propertyDataLookup
			);
			$fullStatementRdfBuilderFactory = new FullStatementRdfBuilderFactory(
				$vocabulary,
				$writer,
				$valueSnakRdfBuilderFactory,
				$tracker,
				$dedupe,
				$propertyDataLookup
			);

			$mediaInfoSpecificComponentsRdfBuilder = new MediaInfoSpecificComponentsRdfBuilder(
				$vocabulary,
				$writer,
				MediaInfoServices::getMediaInfoHandler(),
				MediaWikiServices::getInstance()->getRepoGroup()
			);

			return new MediaInfoRdfBuilder(
				$flavorFlags,
				$termsRdfBuilder,
				$truthyStatementRdfBuilderFactory,
				$fullStatementRdfBuilderFactory,
				$mediaInfoSpecificComponentsRdfBuilder
			);
		},
		Def::RDF_LABEL_PREDICATES => [
			[ RdfVocabulary::NS_SCHEMA_ORG, 'caption' ],
			[ 'rdfs', 'label' ],
		],
		Def::ENTITY_REVISION_LOOKUP_FACTORY_CALLBACK => static function (
			EntityRevisionLookup $defaultLookup
		) {
			$services = MediaWikiServices::getInstance();
			$revisionStoreFactory = $services->getRevisionStoreFactory();
			$blobStoreFactory = $services->getBlobStoreFactory();

			// TODO: this all scaffolding should probably be somehow moved to Wikibase Repo or so?
			$databaseName = WikibaseRepo::getEntitySourceDefinitions()
				->getDatabaseSourceForEntityType( MediaInfo::ENTITY_TYPE )->getDatabaseName();

			$contentCodec = new EntityContentDataCodec(
				WikibaseRepo::getEntityIdParser( $services ),
				WikibaseRepo::getStorageEntitySerializer( $services ),
				WikibaseRepo::getInternalFormatEntityDeserializer(),
				WikibaseRepo::getDataAccessSettings( $services )->maxSerializedEntitySizeInBytes()
			);

			return new FilePageRedirectHandlingRevisionLookup(
				new EntityIdFixingRevisionLookup(
					$defaultLookup,
					WikibaseRepo::getLogger( $services )
				),
				$revisionStoreFactory->getRevisionStore( $databaseName ),
				new WikiPageEntityDataLoader(
					$contentCodec,
					$blobStoreFactory->newBlobStore( $databaseName ),
					$databaseName
				)
			);
		},
		Def::PREFETCHING_TERM_LOOKUP_CALLBACK => static function ( EntitySource $entitySource ) {
			return new MediaInfoPrefetchingTermLookup( WikibaseRepo::getEntityRevisionLookup() );
		},
		Def::ENTITY_ID_LOOKUP_CALLBACK => static function () {
			return MediaInfoServices::getMediaInfoIdLookup();
		},
		Def::LUA_ENTITY_MODULE => 'mw.wikibase.mediainfo.entity',
		Def::URL_LOOKUP_CALLBACK => static function () {
			return new TitleLookupBasedEntityUrlLookup( WikibaseRepo::getEntityTitleLookup() );
		},
		Def::EXISTENCE_CHECKER_CALLBACK => static function () {
			$services = MediaWikiServices::getInstance();
			return new TitleLookupBasedEntityExistenceChecker(
				WikibaseRepo::getEntityTitleLookup( $services ),
				$services->getLinkBatchFactory()
			);
		},
		Def::TITLE_TEXT_LOOKUP_CALLBACK => static function () {
			return new TitleLookupBasedEntityTitleTextLookup(
				WikibaseRepo::getEntityTitleLookup()
			);
		},
		Def::REDIRECT_CHECKER_CALLBACK => static function () {
			return new TitleLookupBasedEntityRedirectChecker( WikibaseRepo::getEntityTitleLookup() );
		},
	]
];
