<?php

// Matches the syntax of Cirrus rescore profiles, e.g. in RescoreProfiles.config.php

$phraseRescorePlaceHolder = [
	'window' => 512,
	'window_size_override' => 'CirrusSearchPhraseRescoreWindowSize',
	'rescore_query_weight' => 10,
	'rescore_query_weight_override' => 'CirrusSearchPhraseRescoreBoost',
	'query_weight' => 1.0,
	'type' => 'phrase',
	// defaults: 'score_mode' => 'total'
];

return [
	// same as `classic_noboostlinks`, except that the template boost scores
	// are not multiplied, only the max template boost will be used
	'classic_noboostlinks_max_boost_template' => [
		'i18n_msg' => 'wikibasemediainfo-rescore-profile-classic-noboostlinks-max-boost-template',
		'supported_namespaces' => 'all',
		'rescore' => [
			$phraseRescorePlaceHolder,
			[
				'window' => 8192,
				'window_size_override' => 'CirrusSearchFunctionRescoreWindowSize',
				'query_weight' => 1.0,
				'rescore_query_weight' => 1.0,
				'score_mode' => 'multiply',
				'type' => 'function_score',
				'function_chain' => 'optional_chain_no_template_boost',
			],
			[
				'window' => 8192,
				'window_size_override' => 'CirrusSearchFunctionRescoreWindowSize',
				'query_weight' => 1.0,
				'rescore_query_weight' => 1.0,
				'score_mode' => 'multiply',
				'type' => 'function_score',
				'function_chain' => 'template_boost_only',
			],
		]
	],
	// use the model trained on a ranklib file generated from the featureset MediaSearch_20210826
	// against the cloudelastic index in August 2021
	'ltr_MediaSearch_20210826' => [
		'i18n_msg' => 'wikibasemediainfo-rescore-profile-ltr-MediaSearch_20210826',
		'supported_namespaces' => [ NS_FILE ],
		'rescore' => [
			[
				'window' => 100,
				'query_weight' => 1.0,
				'rescore_query_weight' => 1.0,
				'score_mode' => 'max',
				'type' => 'ltr',
				'model' => 'MediaSearch_20210826_xgboost_v2_34t_4d',
			],
		]
	],
];
