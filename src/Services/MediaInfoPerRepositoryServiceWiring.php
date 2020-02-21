<?php

use Wikibase\DataAccess\ByTypeDispatchingPrefetchingTermLookup;
use Wikibase\DataAccess\DataAccessSettings;
use Wikibase\DataAccess\GenericServices;
use Wikibase\DataAccess\PerRepositoryServiceContainer;
use Wikibase\Lib\Store\BufferingTermIndexTermLookup;
use Wikibase\MediaInfo\Services\MediaInfoPrefetchingTermLookup;

return [

	'PrefetchingTermLookup' => function (
		PerRepositoryServiceContainer $services,
		GenericServices $genericServices,
		DataAccessSettings $settings
	) {
		return new ByTypeDispatchingPrefetchingTermLookup(
			[ 'mediainfo' => new MediaInfoPrefetchingTermLookup( $services->getEntityRevisionLookup() ) ],
			new BufferingTermIndexTermLookup( $services->getService( 'TermIndex' ), 1000 )
		);
	},

];
