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
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */

use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\LanguageFallbackChain;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoDiffer;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoPatcher;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\Repo\MediaWikiLanguageDirectionalityLookup;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\View\EditSectionGenerator;
use Wikibase\View\EntityTermsView;
use Wikibase\View\Template\TemplateFactory;

return [
	'mediainfo' => [
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
				$languageCode
			);
		},
		'content-model-id' => MediaInfoContent::CONTENT_MODEL_ID,
		'content-handler-factory-callback' => function() {
			$wikibaseRepo = WikibaseRepo::getDefaultInstance();

			return new MediaInfoHandler(
				$entityPerPage = $wikibaseRepo->getStore()->newEntityPerPage(),
				$termIndex = $wikibaseRepo->getStore()->getTermIndex(),
				$codec = $wikibaseRepo->getEntityContentDataCodec(),
				$constraintProvider = $wikibaseRepo->getEntityConstraintProvider(),
				$errorLocalizer = $wikibaseRepo->getValidatorErrorLocalizer(),
				$wikibaseRepo->getEntityIdParser(),
				$wikibaseRepo->getEntityIdLookup(),
				$wikibaseRepo->getLanguageFallbackLabelDescriptionLookupFactory()
			);
		},
		'entity-id-pattern' => MediaInfoId::PATTERN,
		'entity-id-builder' => function( $serialization ) {
			return new MediaInfoId( $serialization );
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
	]
];
