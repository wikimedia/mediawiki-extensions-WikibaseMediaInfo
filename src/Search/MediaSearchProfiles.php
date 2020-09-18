<?php

use Wikibase\MediaInfo\Search\ExperimentalEntityTraversingMediaQueryBuilder;
use Wikibase\MediaInfo\Search\MediaQueryBuilder;

// Search profiles for fulltext search
// Matches the syntax of Cirrus search profiles, e.g. in FullTextQueryBuilderProfiles.config.php
// Note that these will be merged with Cirrus standard profiles,
// so prefixing with 'mediainfo' is recommended.

return [
	MediaQueryBuilder::FULLTEXT_PROFILE_NAME => [
		'builder_factory' => [ MediaQueryBuilder::class, 'newFromGlobals' ],
		'settings' => [
			'boost' => [
				'statement' => 5.0,
				'caption' => 1.0,
				'title' => 0.3,
				'category' => 0.05,
				'heading' => 0.05,
				'auxiliary_text' => 0.05,
				'file_text' => 0.5,
				'redirect.title' => 0.27,
				'suggest' => 0.2,
				'text' => 0.6,
				'non-file_namespace_boost' => 5.0,
			],
			'decay' => [
				'caption-fallback' => 0.9,
			],
		],
	],
	ExperimentalEntityTraversingMediaQueryBuilder::FULLTEXT_PROFILE_NAME => [
		'builder_factory' => [ ExperimentalEntityTraversingMediaQueryBuilder::class, 'newFromGlobals' ],
		'settings' => [
			'boost' => [
				'statement' => 5.0,
				'caption' => 1.0,
				'title' => 0.3,
				'category' => 0.05,
				'heading' => 0.05,
				'auxiliary_text' => 0.05,
				'file_text' => 0.5,
				'redirect.title' => 0.27,
				'suggest' => 0.2,
				'text' => 0.6,
				'non-file_namespace_boost' => 5.0,
			],
			'decay' => [
				'caption-fallback' => 0.9,
			],
		],
	],
];
