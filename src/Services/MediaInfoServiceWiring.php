<?php

use MediaWiki\MediaWikiServices;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\MediaInfo\Services\MediaInfoServices;
use Wikibase\Repo\WikibaseRepo;

return [
	'MediaInfoIdLookup' => static function ( MediaWikiServices $services ) {
		$nsLookup = WikibaseRepo::getEntityNamespaceLookup( $services );
		$entityIdComposer = WikibaseRepo::getEntityIdComposer( $services );
		$mediaInfoNamespace = $nsLookup->getEntityNamespace( MediaInfo::ENTITY_TYPE );

		if ( !is_int( $mediaInfoNamespace ) ) {
			throw new MWException( 'No namespace configured for MediaInfo entities!' );
		}

		return new MediaInfoIdLookup( $entityIdComposer, $mediaInfoNamespace );
	},

	'MediaInfoFilePageLookup' => static function ( MediaWikiServices $services ) {
		return new FilePageLookup( $services->getTitleFactory() );
	},

	'MediaInfoHandler' => static function ( MediaWikiServices $services ) {
		return new MediaInfoHandler(
			WikibaseRepo::getEntityContentDataCodec( $services ),
			WikibaseRepo::getEntityConstraintProvider( $services ),
			WikibaseRepo::getValidatorErrorLocalizer( $services ),
			WikibaseRepo::getEntityIdParser( $services ),
			new MissingMediaInfoHandler(
				MediaInfoServices::getMediaInfoIdLookup(),
				MediaInfoServices::getFilePageLookup(),
				WikibaseRepo::getEntityParserOutputGeneratorFactory( $services )
			),
			MediaInfoServices::getMediaInfoIdLookup(),
			MediaInfoServices::getFilePageLookup(),
			WikibaseRepo::getFieldDefinitionsFactory( $services )
				->getFieldDefinitionsByType( MediaInfo::ENTITY_TYPE ),
			$services->getPageStore(),
			$services->getTitleFactory(),
			null
		);
	}
];
