<?php

namespace Wikibase\MediaInfo\Tests\Unit\Search\Feature;

use CirrusSearch\Parser\QueryStringRegex\KeywordParser;
use CirrusSearch\Parser\QueryStringRegex\OffsetTracker;
use CirrusSearch\Query\KeywordFeatureAssertions;
use CirrusSearch\Search\SearchContext;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\FunctionScore;
use Elastica\Query\MatchQuery;
use Elastica\Script\Script;
use RuntimeException;
use Wikibase\MediaInfo\Search\Feature\CustomMatchFeature;

/**
 * @covers \Wikibase\MediaInfo\Search\Feature\CustomMatchFeature
 */
class CustomMatchFeatureTest extends \MediaWikiIntegrationTestCase {

	public function setUp(): void {
		parent::setUp();

		if ( !\ExtensionRegistry::getInstance()->isLoaded( 'CirrusSearch' ) ) {
			$this->markTestSkipped( 'CirrusSearch needed.' );
		}
	}

	public function expectedQueryProvider() {
		return [
			'regular search' => [
				'expected' => ( new BoolQuery() )
					->addShould(
						new MatchQuery(
							'field_1',
							[ 'query' => 'prefix_1_1Q11111', 'boost' => 9 ]
						)
					)
					->addShould(
						new MatchQuery(
							'field_1',
							[ 'query' => 'prefix_1_2Q11111', 'boost' => 8 ]
						)
					)
					->addShould(
						new MatchQuery(
						  'field_2',
						  [ 'query' => 'prefix_2_1Q11111', 'boost' => 7 ]
						)
					)
					->addShould(
						new MatchQuery(
						  'field_2',
						  [ 'query' => 'prefix_2_2Q11111', 'boost' => 6 ]
						)
					)
					->setMinimumShouldMatch( 1 ),
				'config' => [
					'profile_1' => [
						'fields' => [
							'field_1' => [
								[ 'prefix' => 'prefix_1_1', 'boost' => 9 ],
								[ 'prefix' => 'prefix_1_2', 'boost' => 8 ],
							],
							'field_2' => [
								[ 'prefix' => 'prefix_2_1', 'boost' => 7 ],
								[ 'prefix' => 'prefix_2_2', 'boost' => 6 ],
							],
						],
					],
					'profile_to_ignore' => [
						'fields' => [
							[ 'prefix' => 'prefix_999', 'boost' => 5 ],
						]
					],
				],
				'search string' => 'custommatch:profile_1=Q11111',
			],
			'search with function score' => [
				'expected' => ( new FunctionScore() )
					->setQuery( ( new BoolQuery() )
						->addShould(
							new MatchQuery(
								'field_A',
								[ 'query' => 'prefix_X=Q5', 'boost' => 1 ]
							)
						)
						->addShould(
							new MatchQuery(
								'field_B',
								[ 'query' => 'prefix_Y=Q5', 'boost' => 0 ]
							)
						)
						->setMinimumShouldMatch( 1 ) )
					->addScriptScoreFunction(
						new Script(
							'100 / ( 1 + exp( -1 * ( _score + intercept ) ) )',
							[ 'intercept' => -999 ],
							'expression'
						)
					),
				'config' => [
					'profile_A' => [
						'fields' => [
							'field_A' => [
								[ 'prefix' => 'prefix_X=', 'boost' => 1 ],
							],
							'field_B' => [
								[ 'prefix' => 'prefix_Y=', 'boost' => 0 ],
							],
						],
						'functionScore' => [
							'scriptCode' => '100 / ( 1 + exp( -1 * ( _score + intercept ) ) )',
							'params' => [ 'intercept' => -999 ],
						],
					]
				],
				'search string' => 'custommatch:profile_A=Q5',
			],
			'config empty, no query generated' => [
				'expected' => null,
				'config' => [],
				'search string' => 'custommatch:profile_A=Q5',
			],
		];
	}

	/**
	 * @dataProvider expectedQueryProvider
	 */
	public function testApplySearchContext( ?AbstractQuery $expected, array $config, $searchString ) {
		$searchContext = $this->createMock( SearchContext::class );
		if ( $expected === null ) {
			$searchContext->expects( $this->never() )
				->method( 'addNonTextQuery' );
		} else {
			$searchContext->expects( $this->once() )
				->method( 'addNonTextQuery' )
				->with( $expected );
		}

		$feature = new CustomMatchFeature( $config );
		$this->assertNotNull( $feature->apply( $searchContext, $searchString ) );
	}

	public function applyNoDataProvider() {
		return [
			'empty data' => [
				'custommatch:',
			],
			'no data' => [
				'',
			],
		];
	}

	/**
	 * @dataProvider applyNoDataProvider
	 */
	public function testNotConsumed( $term ) {
		$feature = new CustomMatchFeature( [] );
		$this->getKWAssertions()->assertNotConsumed( $feature, $term );
	}

	public function testInvalidSearchTermWarning() {
		$feature = new CustomMatchFeature( [] );
		$expectedWarnings = [
			[ 'wikibasemediainfo-custommatch-feature-invalid-term',
			'custommatch' ] ];
		$kwAssertions = $this->getKWAssertions();
		$kwAssertions->assertParsedValue(
			$feature, 'custommatch:INVALID', [], $expectedWarnings
		);
		$kwAssertions->assertExpandedData(
			$feature, 'custommatch:INVALID', [], []
		);
		$kwAssertions->assertNoResultsPossible(
			$feature, 'custommatch:INVALID'
		);
	}

	/**
	 * @dataProvider parseProvider
	 */
	public function testParseValue( $value, $expected, $expectedWarnings, $config ) {
		$feature = new CustomMatchFeature( $config );
		$kwAssertions = $this->getKWAssertions();
		$kwAssertions->assertParsedValue(
			$feature, "custommatch:\"$value\"", $expected, $expectedWarnings
		);
	}

	public function testParseValueThrowsWithBadConfig() {
		$feature = new CustomMatchFeature( [
			'profile' => [
				'no_fields' => []
			]
		] );
		$this->expectException( RuntimeException::class );
		$parser = new KeywordParser();
		$node = $parser->parse( 'custommatch:profile=123', $feature, new OffsetTracker() )[0];
		$node->getParsedValue();
	}

	public function parseProvider() {
		return [
			'empty search term' => [
				'value' => '',
				'expected' => [],
				'expectedWarnings' => [ [ 'wikibasemediainfo-custommatch-feature-invalid-term',
					  'custommatch' ] ],
				'config' => [],
			],
			'invalid search term' => [
				'value' => 'sjksey',
				'expected' => [],
				'expectedWarnings' => [ [ 'wikibasemediainfo-custommatch-feature-invalid-term',
					  'custommatch' ] ],
				'config' => [],
			],
			'valid search term, no corresponding profile' => [
				'value' => 'profile=Q123',
				'expected' => [],
				'expectedWarnings' => [ [ 'wikibasemediainfo-custommatch-feature-no-profile',
					  'profile' ] ],
				'config' => [
					'other_profile' => [],
				],
			],
			'all ok, no warnings' => [
				'value' => 'profile=Q888',
				'expected' => [
					[
						'field' => 'field_1',
						'string' => 'prefix_1_1Q888',
						'boost' => 9,
						'profileName' => 'profile',
					],
					[
						'field' => 'field_1',
						'string' => 'prefix_1_2Q888',
						'boost' => 8,
						'profileName' => 'profile',
					],
					[
						'field' => 'field_2',
						'string' => 'Q888',
						'boost' => 1,
						'profileName' => 'profile',
					],
					[
						'field' => 'field_3',
						'string' => 'Q888',
						'boost' => 9,
						'profileName' => 'profile',
					],
					[
						'field' => 'field_4',
						'string' => 'prefix_4_1Q888',
						'boost' => 1,
						'profileName' => 'profile',
					],
					[
						'field' => 'field_4',
						'string' => 'prefix_4_2Q888',
						'boost' => 1,
						'profileName' => 'profile',
					],
				],
				'expectedWarnings' => [],
				'config' => [
					'profile' => [
						'fields' => [
							'field_1' => [
								[ 'prefix' => 'prefix_1_1', 'boost' => 9 ],
								[ 'prefix' => 'prefix_1_2', 'boost' => 8 ],
							],
							// default prefix and boost
							'field_2',
							// default prefix
							'field_3' => [
								[ 'boost' => 9 ]
							],
							// default boost
							'field_4' => [
								[ 'prefix' => 'prefix_4_1' ],
								[ 'prefix' => 'prefix_4_2' ],
							],
						]
					],
				],
			],
		];
	}

	/**
	 * @return KeywordFeatureAssertions
	 */
	private function getKWAssertions() {
		return new KeywordFeatureAssertions( $this );
	}

}
