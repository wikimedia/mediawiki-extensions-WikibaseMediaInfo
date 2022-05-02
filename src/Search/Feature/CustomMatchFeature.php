<?php

namespace Wikibase\MediaInfo\Search\Feature;

use CirrusSearch\Query\SimpleKeywordFeature;
use CirrusSearch\Search\SearchContext;
use CirrusSearch\WarningCollector;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\FunctionScore;
use Elastica\Query\MatchQuery;
use Elastica\Script\Script;
use RuntimeException;

/**
 * Handles the search keyword 'custommatch:'
 *
 * Allows the user to search using custom-configured Match queries. The user supplies a name for
 * the custom profile plus a search term, and a Bool query is created comprising Matches on the
 * fields specified in the config for the custom profile
 *
 * The custom profiles are specified in config like this
 * 	$wgCirrusSearchCustomMatchFeature = [
 * 		string $profileName => [
 * 			'fields' => [
 * 				string $fieldName => [
 * 					[ 'prefix' => string $prefix, 'boost' => float $boost ],
 * 					...
 * 				],
 * 				...
 * 			],
 * 		]
 * 		...
 * 	];
 *
 * So for example if we search using `custommatch:depicts_or_linked_from=Q999` and the config
 * looks like this:
 * 	[
 * 		'depicts_or_linked_from' => [
 * 			'fields' => [
 * 				'statement_keywords' => [
 * 					[ 'prefix' => 'P180=', 'boost' => 10 ],
 * 				],
 * 				'weighted_tags' => [
 * 					[ 'prefix' => 'image.linked.from.wikidata.p18/', 'boost' => 9 ],
 * 					[ 'prefix' => 'image.linked.from.wikidata.p373/', 'boost' => 8 ],
 * 				]
 * 			]
 * 		]
 * 	];
 *
 * Then the resulting query will look like this:
 * 	{
 * 		"query": {
 * 			"bool": {
 * 				"should": [
 * 					{
 * 						"match": {
 * 							"statement_keywords": {
 * 								"query": "P180=Q999",
 * 								"boost": 10
 * 							}
 * 						}
 * 					},
 * 					{
 * 						"match": {
 * 							"weighted_tags": {
 * 								"query": "image.linked.from.wikidata.p18\/Q999",
 * 								"boost": 9
 * 							}
 * 						}
 * 					},
 * 					{
 * 						"match": {
 * 							"weighted_tags": {
 * 								"query": "image.linked.from.wikidata.p373\/Q999",
 * 								"boost": 8
 * 							}
 * 						}
 * 					},
 * 				]
 * 			}
 * 		}
 * 	}
 *
 * A profile can also have a function score associated with it. Configuration looks like this:
 * 	string $profileName => [
 * 		'fields' => [ ... ],
 * 		'functionScore' => [
 * 			'scriptCode' => string $code,
 * 			'params' => [],
 * 		]
 * 	]
 *
 * In our previous example if we have the following config for the profile 'depicts_or_linked_from':
 * 	[
 * 		'depicts_or_linked_from' => [
 * 			'fields' => [ (as above) ],
 * 			'functionScore' => [
 * 				'scriptCode' => '100 / ( 1 + exp( -1 * ( _score + intercept ) ) )',
 * 				'params' => [ 'intercept' => -1.11111 ]
 * 			]
 * 		]
 * 	];
 *
 * ... then the resulting query will look like this:
 * 	{
 * 		"function_score": {
 * 			"query": { (as above) },
 * 			"functions": [
 * 				{
 * 					"script_score": {
 * 						"script": {
 * 							"source": "100 \/ ( 1 + exp( -1 * ( _score + intercept ) ) )",
 * 							"params": {
 * 								"intercept": -1.11111
 * 							},
 * 							"lang": "expression"
 * 						}
 * 					}
 * 				}
 * 			]
 * 		}
 * 	}
 *
 * @uses CirrusSearch
 * @see https://phabricator.wikimedia.org/T296309
 */
class CustomMatchFeature extends SimpleKeywordFeature {

	/** @var array */
	private $featureConfig;

	public function __construct( array $featureConfig ) {
		$this->featureConfig = $featureConfig;
	}

	/**
	 * @return string[]
	 */
	protected function getKeywords() {
		return [ 'custommatch' ];
	}

	/**
	 * @param SearchContext $context
	 * @param string $key The keyword
	 * @param string $value The value attached to the keyword with quotes stripped
	 * @param string $quotedValue The original value in the search string, including quotes if used
	 * @param bool $negated Is the search negated? Not used to generate the returned AbstractQuery,
	 *  that will be negated as necessary. Used for any other building/context necessary.
	 * @return array Two element array, first an AbstractQuery or null to apply to the
	 *  query. Second a boolean indicating if the quotedValue should be kept in the search
	 *  string.
	 */
	protected function doApply( SearchContext $context, $key, $value, $quotedValue, $negated ) {
		$queries = $this->parseValue(
			$key,
			$value,
			$quotedValue,
			'',
			'',
			$context
		);
		if ( count( $queries ) === 0 ) {
			$context->setResultsPossible( false );
			return [ null, false ];
		}
		$query = $this->combineQueries( $queries );
		if ( !$negated ) {
			$context->addNonTextQuery( $query );
			return [ null, false ];
		} else {
			return [ $query, false ];
		}
	}

	/**
	 * Wraps query in a FunctionScore
	 *
	 * @param string $profileName
	 * @param AbstractQuery $query
	 * @return AbstractQuery
	 */
	private function applyFunctionScore( string $profileName, AbstractQuery $query
	): AbstractQuery {
		$config = $this->featureConfig[$profileName]['functionScore'] ?? null;
		if ( $config === null ) {
			return $query;
		}
		if ( !isset( $config['scriptCode'] ) ) {
			return $query;
		}

		return ( new FunctionScore() )
			->setQuery( $query )
			->addScriptScoreFunction(
				new Script(
					$config['scriptCode'],
					$config['params'] ?? [],
					'expression'
				)
			);
	}

	/**
	 * Combines parameterized queries into single query containing MatchQuery objects
	 *
	 * @param string[][] $queries queries to combine. See generateParameterizedQueries() for fields.
	 * @return AbstractQuery
	 */
	private function combineQueries( array $queries ): AbstractQuery {
		$profileName = '';
		$return = new BoolQuery();
		$return->setMinimumShouldMatch( 1 );
		foreach ( $queries as $query ) {
			$return->addShould( new MatchQuery(
				$query['field'],
				[ 'query' => $query['string'], 'boost' => $query['boost'] ]
			) );
			$profileName = $query['profileName'];
		}
		return $this->applyFunctionScore( $profileName, $return );
	}

	/**
	 * @param string $key
	 * @param string $value
	 * @param string $quotedValue
	 * @param string $valueDelimiter
	 * @param string $suffix
	 * @param WarningCollector $warningCollector
	 * @return array [
	 * 		[
	 * 			'field' => document field to run the query against,
	 * 			'string' => string to search for,
	 * 			'weight' => the boost for the query
	 * 		],
	 * 		...
	 * 	]
	 */
	public function parseValue(
		$key,
		$value,
		$quotedValue,
		$valueDelimiter,
		$suffix,
		WarningCollector $warningCollector
	) {
		$parsedSearchString = $this->parseSearchString( $value, $key, $warningCollector );
		if ( $parsedSearchString === null ) {
			return [];
		}
		return $this->generateParameterizedQueries(
			$parsedSearchString['profileName'], $parsedSearchString['searchTerm'] );
	}

	/**
	 * We expect the search string to be in the form <profile name>=<search term>. This function
	 * checks the format and if it's ok returns an array with the profile name and search
	 * terms separated
	 *
	 * @param string $searchString
	 * @param string $keyword
	 * @param WarningCollector|null $warningCollector
	 * @return array|null
	 */
	private function parseSearchString( string $searchString, string $keyword = '',
										WarningCollector $warningCollector = null
	): ?array {
		if ( !preg_match( '/^(\w+)=(.+)$/i', $searchString, $matches ) ) {
			if ( $warningCollector !== null ) {
				$warningCollector->addWarning(
					'wikibasemediainfo-custommatch-feature-invalid-term',
					$keyword
				);
			}
			return null;
		}
		$profileName = $matches[1];
		$searchTerm = $matches[2];
		if ( !isset( $this->featureConfig[ $profileName ] ) ) {
			if ( $warningCollector !== null ) {
				$warningCollector->addWarning( 'wikibasemediainfo-custommatch-feature-no-profile',
					$profileName );
			}
			return null;
		}
		if ( !isset( $this->featureConfig[ $profileName ][ 'fields' ] ) ||
			 !is_array( $this->featureConfig[ $profileName ][ 'fields' ] )
		) {
			throw new RuntimeException( 'The CustomMatch cirrussearch feature is misconfigured' );
		}
		return [
			'profileName' => $profileName,
			'searchTerm' => $searchTerm,
		];
	}

	private function generateParameterizedQueries( string $profileName, string $searchTerm
	): array {
		$queries = [];
		foreach ( $this->featureConfig[ $profileName ][ 'fields' ] as $field => $config ) {
			if ( is_array( $config ) ) {
				foreach ( $config as $configRow ) {
					$prefix = $configRow['prefix'] ?? '';
					$boost = $configRow['boost'] ?? 1;
					$queries[] = [
						'field' => $field,
						'string' => $prefix . $searchTerm,
						'boost' => $boost,
						'profileName' => $profileName,
					];
				}
			} else {
				$queries[] = [
					'field' => $config,
					'string' => $searchTerm,
					'boost' => 1,
					'profileName' => $profileName,
				];
			}
		}
		return $queries;
	}
}
