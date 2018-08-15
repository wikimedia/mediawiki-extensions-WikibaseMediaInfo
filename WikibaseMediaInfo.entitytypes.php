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
use Wikibase\Client\WikibaseClient;
use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\DataModel\Services\Lookup\InProcessCachingDataTypeLookup;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\LanguageFallbackChain;
use Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoDiffer;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoPatcher;
use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\Repo\MediaWikiLanguageDirectionalityLookup;
use Wikibase\Repo\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\StatementProviderFieldDefinitions;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\SettingsArray;
use Wikibase\View\EditSectionGenerator;
use Wikibase\View\EntityTermsView;
use Wikibase\View\Template\TemplateFactory;

return [
	'mediainfo' => [
		'storage-serializer-factory-callback' => function( SerializerFactory $serializerFactory ) {
			return new MediaInfoSerializer(
				$serializerFactory->newTermListSerializer(),
				$serializerFactory->newStatementListSerializer()
			);
		},
		'serializer-factory-callback' => function( SerializerFactory $serializerFactory ) {
			return new MediaInfoSerializer(
				$serializerFactory->newTermListSerializer(),
				$serializerFactory->newStatementListSerializer()
			);
		},
		'deserializer-factory-callback' => function( DeserializerFactory $deserializerFactory ) {
			return new MediaInfoDeserializer(
				$deserializerFactory->newTermListDeserializer(),
				$deserializerFactory->newStatementListDeserializer()
			);
		},
		'view-factory-callback' => function(
			$languageCode,
			LabelDescriptionLookup $labelDescriptionLookup,
			LanguageFallbackChain $fallbackChain,
			EditSectionGenerator $editSectionGenerator,
			EntityTermsView $entityTermsView
		) {
			$viewFactory = WikibaseRepo::getDefaultInstance()->getViewFactory();

			return new MediaInfoView(
				TemplateFactory::getDefaultInstance(),
				$entityTermsView,
				$viewFactory->newStatementSectionsView(
					$languageCode,
					$labelDescriptionLookup,
					$fallbackChain,
					$editSectionGenerator
				),
				new MediaWikiLanguageDirectionalityLookup(),
				$languageCode,
				MediaWikiServices::getInstance()->getLinkRenderer(),
				MediaInfoServices::getFilePageLookup()
			);
		},
		'content-model-id' => MediaInfoContent::CONTENT_MODEL_ID,
		'search-field-definitions' => function ( array $languageCodes, SettingsArray $searchSettings ) {
			$repo = WikibaseRepo::getDefaultInstance();
			return new MediaInfoFieldDefinitions(
				new LabelsProviderFieldDefinitions( $languageCodes ),
				new DescriptionsProviderFieldDefinitions( $languageCodes,
					$searchSettings->getSetting( 'entitySearch' ) ),
				StatementProviderFieldDefinitions::newFromSettings(
					new InProcessCachingDataTypeLookup( $repo->getPropertyDataTypeLookup() ),
					$repo->getDataTypeDefinitions()->getSearchIndexDataFormatterCallbacks(),
					$searchSettings
				)
			);
		},
		'content-handler-factory-callback' => function() {
			$wikibaseRepo = WikibaseRepo::getDefaultInstance();

			return new MediaInfoHandler(
				$wikibaseRepo->getStore()->getTermIndex(),
				$wikibaseRepo->getEntityContentDataCodec(),
				$wikibaseRepo->getEntityConstraintProvider(),
				$wikibaseRepo->getValidatorErrorLocalizer(),
				$wikibaseRepo->getEntityIdParser(),
				$wikibaseRepo->getEntityIdLookup(),
				$wikibaseRepo->getLanguageFallbackLabelDescriptionLookupFactory(),
				new MissingMediaInfoHandler(
					MediaInfoServices::getMediaInfoIdLookup(),
					MediaInfoServices::getFilePageLookup(),
					$wikibaseRepo->getEntityParserOutputGeneratorFactory()
				),
				MediaInfoServices::getFilePageLookup(),
				$wikibaseRepo->getFieldDefinitionsByType( MediaInfo::ENTITY_TYPE ),
				WikibaseClient::getDefaultInstance()->getStore()->getUsageUpdater(),
				null
			);
		},
		'entity-id-pattern' => MediaInfoId::PATTERN,
		'entity-id-builder' => function( $serialization ) {
			return new MediaInfoId( $serialization );
		},
		'entity-id-composer-callback' => function( $repositoryName, $uniquePart ) {
			return new MediaInfoId( EntityId::joinSerialization( [
				$repositoryName,
				'',
				'M' . $uniquePart
			] ) );
		},
		'entity-differ-strategy-builder' => function() {
			return new MediaInfoDiffer();
		},
		'entity-patcher-strategy-builder' => function() {
			return new MediaInfoPatcher();
		},
		'entity-factory-callback' => function() {
			return new MediaInfo();
		},

		// Identifier of a resource loader module that, when `require`d, returns a function
		// returning a deserializer
		'js-deserializer-factory-function' => 'wikibase.mediainfo.getDeserializer',
		'changeop-deserializer-callback' => function() {
			$changeOpDeserializerFactory = WikibaseRepo::getDefaultInstance()
				->getChangeOpDeserializerFactory();

			return new MediaInfoChangeOpDeserializer(
				$changeOpDeserializerFactory->getLabelsChangeOpDeserializer(),
				$changeOpDeserializerFactory->getDescriptionsChangeOpDeserializer(),
				$changeOpDeserializerFactory->getClaimsChangeOpDeserializer()
			);
		},
	]
];
