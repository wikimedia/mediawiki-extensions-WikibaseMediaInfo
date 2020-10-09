<?php

// Matches the syntax of Cirrus function chains, e.g. in RescoreFunctionChains.config.php

return [
	'optional_chain_no_template_boost' => [
		'functions' => [
			[ 'type' => 'recency' ],
			[ 'type' => 'namespaces' ],
			[ 'type' => 'language' ],
		],
		'add_extensions' => true,
	],
	'template_boost_only' => [
		'functions' => [
			[ 'type' => 'templates' ],
		],
		'score_mode' => 'max',
	],
];
