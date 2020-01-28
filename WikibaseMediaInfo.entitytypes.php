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
use Wikibase\DataAccess\SingleEntitySourceServices;
use Wikibase\DataAccess\UnusableEntitySource;
use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\DataModel\Services\EntityId\EntityIdFormatter;
use Wikibase\DataModel\Services\Lookup\InProcessCachingDataTypeLookup;
use Wikibase\LanguageFallbackChain;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\Lib\Store\CachingPropertyOrderProvider;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\EntityInfo;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\Sql\WikiPageEntityDataLoader;
use Wikibase\Lib\Store\Sql\WikiPageEntityMetaDataLookup;
use Wikibase\Lib\Store\WikiPagePropertyOrderProvider;
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
use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\MediaInfo\Services\MediaInfoEntityQuery;
use Wikibase\MediaInfo\Services\MediaInfoPrefetchingTermLookup;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\MediaInfo\View\MediaInfoEntityStatementsView;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\Rdf\DedupeBag;
use Wikibase\Rdf\EntityMentionListener;
use Wikibase\Rdf\RdfVocabulary;
use Wikibase\Repo\Diff\ClaimDiffer;
use Wikibase\Repo\Diff\ClaimDifferenceVisualizer;
use Wikibase\Repo\MediaWikiLanguageDirectionalityLookup;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\StatementProviderFieldDefinitions;
use Wikibase\SettingsArray;
use Wikimedia\Purtle\RdfWriter;

return [
	MediaInfo::ENTITY_TYPE => [
		'storage-serializer-factory-callback' => function ( SerializerFactory $serializerFactory ) {
			return new MediaInfoSerializer(
				$serializerFactory->newTermListSerializer(),
				$serializerFactory->newStatementListSerializer()
			);
		},
		'serializer-factory-callback' => function ( SerializerFactory $serializerFactory ) {
			return new MediaInfoSerializer(
				$serializerFactory->newTermListSerializer(),
				$serializerFactory->newStatementListSerializer()
			);
		},
		'deserializer-factory-callback' => function ( DeserializerFactory $deserializerFactory ) {
			return new MediaInfoDeserializer(
				$deserializerFactory->newEntityIdDeserializer(),
				$deserializerFactory->newTermListDeserializer(),
				$deserializerFactory->newStatementListDeserializer()
			);
		},
		'view-factory-callback' => function (
			Language $language,
			LanguageFallbackChain $fallbackChain,
			EntityDocument $entity,
			EntityInfo $entityInfo
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
				$fallbackChain
			);

			// Use a MediaInfo-specific EntityStatementView class
			$wbRepo = WikibaseRepo::getDefaultInstance();
			$propertyOrderProvider = new CachingPropertyOrderProvider(
				new WikiPagePropertyOrderProvider(
					Title::newFromText( 'MediaWiki:Wikibase-SortedProperties' )
				),
				ObjectCache::getLocalClusterInstance()
			);

			$defaultPropertyIdsForView = [];
			$properties = $mwConfig->get( 'MediaInfoProperties' ) ?? [];
			foreach ( $properties as $propertyId ) {
				$defaultPropertyIdsForView[] = new PropertyId( $propertyId );
			}

			$statementsView = new MediaInfoEntityStatementsView(
				$propertyOrderProvider,
				$textProvider,
				$defaultPropertyIdsForView,
				$wbRepo->getSnakFormatterFactory(),
				$wbRepo->getValueFormatterFactory(),
				$wbRepo->getCompactBaseDataModelSerializerFactory(),
				$languageCode,
				$properties
			);

			return new MediaInfoView(
				$mediaInfoEntityTermsView,
				$languageCode,
				$statementsView
			);
		},
		'content-model-id' => MediaInfoContent::CONTENT_MODEL_ID,
		'search-field-definitions' => function ( array $languageCodes, SettingsArray $searchSettings ) {
			$repo = WikibaseRepo::getDefaultInstance();
			$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikibaseCirrusSearch' );
			return new MediaInfoFieldDefinitions(
				new LabelsProviderFieldDefinitions( $languageCodes ),
				new DescriptionsProviderFieldDefinitions( $languageCodes,
					$config->get( 'UseStemming' ) ),
				StatementProviderFieldDefinitions::newFromSettings(
					new InProcessCachingDataTypeLookup( $repo->getPropertyDataTypeLookup() ),
					$repo->getDataTypeDefinitions()->getSearchIndexDataFormatterCallbacks(),
					$searchSettings
				)
			);
		},
		'content-handler-factory-callback' => function () {
			return MediaInfoServices::getMediaInfoHandler();
		},
		'entity-id-pattern' => MediaInfoId::PATTERN,
		'entity-id-builder' => function ( $serialization ) {
			return new MediaInfoId( $serialization );
		},
		'entity-id-composer-callback' => function ( $repositoryName, $uniquePart ) {
			return new MediaInfoId( EntityId::joinSerialization( [
				$repositoryName,
				'',
				'M' . $uniquePart
			] ) );
		},
		'entity-differ-strategy-builder' => function () {
			return new MediaInfoDiffer();
		},
		'entity-patcher-strategy-builder' => function () {
			return new MediaInfoPatcher();
		},
		'entity-factory-callback' => function () {
			return new MediaInfo();
		},

		// Identifier of a resource loader module that, when `require`d, returns a function
		// returning a deserializer
		'js-deserializer-factory-function' => 'wikibase.mediainfo.getDeserializer',
		'changeop-deserializer-callback' => function () {
			$changeOpDeserializerFactory = WikibaseRepo::getDefaultInstance()
				->getChangeOpDeserializerFactory();

			return new MediaInfoChangeOpDeserializer(
				$changeOpDeserializerFactory->getLabelsChangeOpDeserializer(),
				$changeOpDeserializerFactory->getDescriptionsChangeOpDeserializer(),
				$changeOpDeserializerFactory->getClaimsChangeOpDeserializer()
			);
		},
		'entity-diff-visualizer-callback' => function (
			MessageLocalizer $messageLocalizer,
			ClaimDiffer $claimDiffer,
			ClaimDifferenceVisualizer $claimDiffView,
			SiteLookup $siteLookup,
			EntityIdFormatter $entityIdFormatter
		) {
			return new BasicMediaInfoDiffVisualizer(
				$messageLocalizer,
				$claimDiffer,
				$claimDiffView,
				$siteLookup,
				$entityIdFormatter
			);
		},
		'entity-metadata-accessor-callback' => function ( $dbName, $repoName ) {
			$wikibaseRepo = WikibaseRepo::getDefaultInstance();
			$entityNamespaceLookup = $wikibaseRepo->getEntityNamespaceLookup();
			$entityQuery = new MediaInfoEntityQuery(
				$entityNamespaceLookup,
				MediaWikiServices::getInstance()->getSlotRoleStore()
			);

			$dataAccessSettings = $wikibaseRepo->getDataAccessSettings();

			if ( $dataAccessSettings->useEntitySourceBasedFederation() ) {
				$entitySource = $wikibaseRepo->getEntitySourceDefinitions()
					->getSourceForEntityType( MediaInfo::ENTITY_TYPE );
			} else {
				$entitySource = new UnusableEntitySource();
			}

			return new WikiPageEntityMetaDataLookup(
				$entityNamespaceLookup,
				$entityQuery,
				$entitySource,
				$dataAccessSettings,
				$dbName,
				$repoName
			);
		},
		'rdf-builder-factory-callback' => function (
			$flavorFlags,
			RdfVocabulary $vocabulary,
			RdfWriter $writer,
			EntityMentionListener $tracker,
			DedupeBag $dedupe
		) {
			return new MediaInfoRdfBuilder(
				$vocabulary,
				$writer,
				MediaInfoServices::getMediaInfoHandler(),
				MediaWikiServices::getInstance()->getRepoGroup()
			);
		},
		'rdf-builder-label-predicates' => [
			[ RdfVocabulary::NS_SCHEMA_ORG, 'caption' ],
			[ 'rdfs', 'label' ],
		],
		'entity-revision-lookup-factory-callback' => function (
			EntityRevisionLookup $defaultLookup
		) {
			$revisionStoreFactory = MediaWikiServices::getInstance()->getRevisionStoreFactory();
			$blobStoreFactory = MediaWikiServices::getInstance()->getBlobStoreFactory();

			$wbRepo = WikibaseRepo::getDefaultInstance();
			// TODO: this all scaffolding should probably be somehow moved to Wikibase Repo or so?
			$databaseName = $wbRepo->getEntitySourceDefinitions()->getSourceForEntityType( MediaInfo::ENTITY_TYPE )->getDatabaseName();

			$contentCodec = new EntityContentDataCodec(
				$wbRepo->getEntityIdParser(),
				$wbRepo->getStorageEntitySerializer(),
				$wbRepo->getInternalFormatEntityDeserializer(),
				$wbRepo->getDataAccessSettings()->maxSerializedEntitySizeInBytes()
			);

			return new FilePageRedirectHandlingRevisionLookup(
				new EntityIdFixingRevisionLookup( $defaultLookup, $wbRepo->getLogger() ),
				$revisionStoreFactory->getRevisionStore( $databaseName ),
				new WikiPageEntityDataLoader( $contentCodec, $blobStoreFactory->newBlobStore( $databaseName ) )
			);
		},
		'prefetching-term-lookup-callback' => function ( SingleEntitySourceServices $services ) {
			return new MediaInfoPrefetchingTermLookup( $services->getEntityRevisionLookup() );
		},
		'entity-id-lookup-callback' => function () {
			return MediaInfoServices::getMediaInfoIdLookup();
		},
		'lua-entity-module' => 'mw.wikibase.mediainfo.entity',
	]
];
