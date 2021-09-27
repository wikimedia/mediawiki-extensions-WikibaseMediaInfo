<?php

$cfg = require __DIR__ . '/../vendor/mediawiki/mediawiki-phan-config/src/config.php';

// These are too spammy for now. TODO enable
$cfg['scalar_implicit_cast'] = true;

$cfg['directory_list'] = array_merge(
	$cfg['directory_list'],
	[
		'../../extensions/Wikibase/client',
		'../../extensions/Wikibase/repo',
		'../../extensions/Wikibase/lib',
		'../../extensions/Wikibase/view',
		'../../extensions/Wikibase/data-access',
		'../../extensions/CirrusSearch',
		'../../extensions/Elastica',
		'../../extensions/WikibaseCirrusSearch',
	]
);

$cfg['exclude_analysis_directory_list'] = array_merge(
	$cfg['exclude_analysis_directory_list'],
	[
		'../../extensions/Wikibase/client',
		'../../extensions/Wikibase/repo',
		'../../extensions/Wikibase/lib',
		'../../extensions/Wikibase/view',
		'../../extensions/Wikibase/data-access',
		'../../extensions/CirrusSearch',
		'../../extensions/Elastica',
		'../../extensions/WikibaseCirrusSearch',
	]
);

return $cfg;
