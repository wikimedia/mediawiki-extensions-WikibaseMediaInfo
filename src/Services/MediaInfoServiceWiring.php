<?php

use MediaWiki\MediaWikiServices;
use Wikibase\Client\Store\TitleFactory;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\Repo\WikibaseRepo;

return [
	'MediaInfoIdLookup' => function( MediaWikiServices $services ) {
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$nsLookup = $wbRepo->getEntityNamespaceLookup();
		$entityIdComposer = $wbRepo->getEntityIdComposer();
		$mediaInfoNamespace = $nsLookup->getEntityNamespace( MediaInfo::ENTITY_TYPE );

		if ( !is_int( $mediaInfoNamespace ) ) {
			throw new MWException( 'No namespace configured for MediaInfo entities!' );
		}

		return new MediaInfoIdLookup( $entityIdComposer, $mediaInfoNamespace );
	},

	'MediaInfoFilePageLookup' => function( MediaWikiServices $services ) {
		return new FilePageLookup( new TitleFactory() );
	},

	'MediaInfoHandler' => function( MediaWikiServices $services ) {
		$wikibaseRepo = WikibaseRepo::getDefaultInstance();

		return new MediaInfoHandler(
			$wikibaseRepo->getEntityContentDataCodec(),
			$wikibaseRepo->getEntityConstraintProvider(),
			$wikibaseRepo->getValidatorErrorLocalizer(),
			$wikibaseRepo->getEntityIdParser(),
			new MissingMediaInfoHandler(
				MediaInfoServices::getMediaInfoIdLookup(),
				MediaInfoServices::getFilePageLookup(),
				$wikibaseRepo->getEntityParserOutputGeneratorFactory()
			),
			MediaInfoServices::getMediaInfoIdLookup(),
			MediaInfoServices::getFilePageLookup(),
			$wikibaseRepo->getFieldDefinitionsByType( MediaInfo::ENTITY_TYPE ),
			null
		);
	}
];
