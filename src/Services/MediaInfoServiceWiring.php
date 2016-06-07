<?php

use MediaWiki\MediaWikiServices;
use Wikibase\Client\Store\TitleFactory;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\Repo\WikibaseRepo;

return [
	'MediaInfoIdLookup' => function( MediaWikiServices $services ) {
		// XXX: is there no better way?
		$nsLookup = WikibaseRepo::getDefaultInstance()->getEntityNamespaceLookup();
		$mediaInfoNamespace = $nsLookup->getEntityNamespace( MediaInfo::ENTITY_TYPE );

		if ( $mediaInfoNamespace === false ) {
			throw new MWException( 'No namespace configured for MediaInfo entities!' );
		}

		return new MediaInfoIdLookup( $mediaInfoNamespace );
	},

	'MediaInfoFilePageLookup' => function( MediaWikiServices $services ) {
		return new FilePageLookup( new TitleFactory() );
	}
];
