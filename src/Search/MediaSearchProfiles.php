<?php
// Search profiles for fulltext search
// Matches the syntax of Cirrus search profiles, e.g. in FullTextQueryBuilderProfiles.config.php
// Note that these will be merged with Cirrus standard profiles,
// so prefixing with 'mediainfo' is recommended.
return [
	\Wikibase\MediaInfo\Search\MediaQueryBuilder::FULLTEXT_PROFILE_NAME => [
		'builder_factory' => [ \Wikibase\MediaInfo\Search\MediaQueryBuilder::class, 'newFromGlobals' ],
		'settings' => [
			'statement' => 20.0,
			'statement-discount' => 0.8,
			'caption' => 3.0,
			'caption-fallback-discount' => 0.9,
			'all' => 1.0,
			'all.plain' => 1.0,
			'title' => 1.0,
			'redirect.title' => 1.0,
			'category' => 1.5,
			'text' => 1.0,
			'auxiliary_text' => 1.0,
			'file_text' => 1.0,
			'non-file_namespace_boost' => 5.0,
		],
	],
];
