<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Api;

use ApiMain;
use FauxRequest;
use MediaWiki\Http\HttpRequestFactory;
use MediaWikiTestCase;
use MWHttpRequest;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\Lib\Formatters\OutputFormatSnakFormatterFactory;
use Wikibase\Lib\Formatters\SnakFormatter;
use Wikibase\MediaInfo\Api\ApiRelatedConcepts;
use Wikibase\Repo\WikibaseRepo;

/**
 * @covers \Wikibase\MediaInfo\Api\ApiRelatedConcepts
 */
class ApiRelatedConceptsTest extends MediaWikiTestCase {

	private function mockSearchResponse( array $ids ) {
		return [
			'query' => [
				'search' => array_map( static function ( $id ) {
					return [ 'title' => $id ];
				}, $ids ),
			],
		];
	}

	private function mockEntityResponse( array $ids ) {
		return [
			'entities' => array_combine( $ids, array_map( static function ( $id ) {
				return [
					'pageid' => (int)preg_replace( '/[^0-9]/', '', $id ),
					'ns' => 0,
					'title' => $id,
					'lastrevid' => (int)preg_replace( '/[^0-9]/', '', $id ),
					'modified' => '2020-01-01T00:00:00Z',
					'type' => 'item',
					'id' => $id,
					'labels' => [
						'en' => [ 'language' => 'en', 'value' => "Label for $id" ],
					],
					'descriptions' => [
						'en' => [ 'language' => 'en', 'value' => "Description for $id" ],
					],
					'aliases' => [
						'en' => [
							[ 'language' => 'en', 'value' => "Alias for $id" ],
							[ 'language' => 'en', 'value' => "Another alias for $id" ],
						],
					],
					'claims' => [
						'P1' => [
							[
								'mainsnak' => [
									'snaktype' => 'value',
									'property' => 'P1',
									'hash' => 'fedcba9876543210fedcba9876543210fedcba98',
									'datavalue' => [
										'value' => [
											'entity-type' => 'item',
											'numeric-id' => 1,
											'id' => 'Q10',
										],
										'type' => 'wikibase-entityid',
									],
									'datatype' => 'wikibase-item',
								],
								'type' => 'statement',
								'qualifiers' => [],
								'qualifiers-order' => [],
								'id' => "$id$01234567-89ab-cdef-0123-456789abcdef",
								'rank' => 'normal',
								'references' => [],
							],
						],
					],
					'sitelinks' => [],
				];
			}, $ids ) ),
		];
	}

	public function testFindMatchingEntityIds() {
		$httpRequestFactory = $this->createMockHttpRequestFactory( [
			// phpcs:ignore Generic.Files.LineLength.TooLong
			'api.php?format=json&action=query&list=search&srsearch=cat&srnamespace=0&srlimit=50&srqiprofile=wikibase&uselang=en' =>
				$this->mockSearchResponse( [ 'Q1', 'Q2' ] ),
			// phpcs:ignore Generic.Files.LineLength.TooLong
			'api.php?format=json&action=query&list=search&srsearch=dog&srnamespace=0&srlimit=10&srqiprofile=wikibase&uselang=en' =>
				$this->mockSearchResponse( [] ),
		] );

		$api = new ApiRelatedConcepts(
			new ApiMain(),
			'relatedconcepts',
			$httpRequestFactory,
			WikibaseRepo::getBaseDataModelDeserializerFactory(),
			$this->createMockSnakFormatterFactory(),
			'api.php',
			[]
		);

		$this->assertEquals( [ 'Q1', 'Q2' ], $api->findMatchingEntityIds( 'cat', 1000 ) );
		$this->assertEquals( [], $api->findMatchingEntityIds( 'dog' ) );
	}

	public function testGetEntities() {
		$httpRequestFactory = $this->createMockHttpRequestFactory( [
			'api.php?format=json&action=wbgetentities&ids=Q1%7CQ2&uselang=en' =>
				$this->mockEntityResponse( [ 'Q1', 'Q2' ] ),
		] );

		$api = new ApiRelatedConcepts(
			new ApiMain(),
			'relatedconcepts',
			$httpRequestFactory,
			WikibaseRepo::getBaseDataModelDeserializerFactory(),
			$this->createMockSnakFormatterFactory(),
			'api.php',
			[]
		);

		$result = $api->getEntities( [ 'Q1', 'Q2' ] );

		$this->assertArrayHasKey( 'Q1', $result );
		$this->assertArrayHasKey( 'Q2', $result );
		$this->assertInstanceOf( 'Wikibase\\DataModel\\Entity\\Item', $result['Q1'] );
		$this->assertInstanceOf( 'Wikibase\\DataModel\\Entity\\Item', $result['Q2'] );
	}

	public static function evaluateHeuristicsProvider(): array {
		return [
			[
				// must property
				[ [
					'must' => [
						[ 'property' => 'P1' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// must property + item
				[ [
					'must' => [
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple must, both satisfied
				[ [
					'must' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple must, one satisfied
				[ [
					'must' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// multiple must, none satisfied
				[ [
					'must' => [
						[ 'property' => 'P99' ],
						[ 'property' => 'P99', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// should property
				[ [
					'should' => [
						[ 'property' => 'P1' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// should property + item
				[ [
					'should' => [
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple should, both satisfied
				[ [
					'should' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple should, one satisfied
				[ [
					'should' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple should, none satisfied
				[ [
					'should' => [
						[ 'property' => 'P99' ],
						[ 'property' => 'P99', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// must not property
				[ [
					'must not' => [
						[ 'property' => 'P1' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// must not property + item
				[ [
					'must not' => [
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// multiple must not, both satisfied
				[ [
					'must not' => [
						[ 'property' => 'P99' ],
						[ 'property' => 'P99', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple must not, one satisfied
				[ [
					'must not' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// multiple must not, none satisfied
				[ [
					'must not' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// should not property
				[ [
					'should not' => [
						[ 'property' => 'P1' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// should not property + item
				[ [
					'should not' => [
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// multiple should not, both satisfied
				[ [
					'should not' => [
						[ 'property' => 'P99' ],
						[ 'property' => 'P99', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple should not, one satisfied
				[ [
					'should not' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q99' ],
					],
					'result' => [ 'ok' ],
				] ],
				[ 'ok' ]
			],
			[
				// multiple should not, none satisfied
				[ [
					'should not' => [
						[ 'property' => 'P1' ],
						[ 'property' => 'P1', 'item' => 'Q10' ],
					],
					'result' => [ 'ok' ],
				] ],
				[]
			],
			[
				// recursive, both parent & child satisfied
				[ [
					'must' => [
						[ 'property' => 'P1' ],
					],
					'result' => [ 'ok' ],
					'conditions' => [ [
						'must' => [
							[ 'property' => 'P1', 'item' => 'Q10' ],
						],
						'result' => [ 'ok' ],
					] ],
				] ],
				[ 'ok', 'ok' ]
			],
		];
	}

	/**
	 * @dataProvider evaluateHeuristicsProvider
	 * @param array $heuristic
	 * @param array $expect
	 */
	public function testEvaluateHeuristics( $heuristic, $expect ) {
		$deserializerFactory = WikibaseRepo::getBaseDataModelDeserializerFactory();
		$api = new ApiRelatedConcepts(
			new ApiMain(),
			'relatedconcepts',
			$this->createMockHttpRequestFactory( [] ),
			$deserializerFactory,
			$this->createMockSnakFormatterFactory(),
			'api.php',
			$heuristic
		);

		$entity = $deserializerFactory->newItemDeserializer()->deserialize(
			$this->mockEntityResponse( [ 'Q1' ] )['entities']['Q1']
		);
		$result = $api->evaluateHeuristics( $entity, $heuristic );
		$this->assertEquals( $expect, $result );
	}

	public function testEndToEnd() {
		$httpRequestFactory = $this->createMockHttpRequestFactory( [
			// phpcs:ignore Generic.Files.LineLength.TooLong
			'api.php?format=json&action=query&list=search&srsearch=cat&srnamespace=0&srlimit=3&srqiprofile=wikibase&uselang=en' =>
				$this->mockSearchResponse( [ 'Q1' ] ),
			'api.php?format=json&action=wbgetentities&ids=Q1&uselang=en' =>
				$this->mockEntityResponse( [ 'Q1' ] ),
		] );

		$api = new ApiRelatedConcepts(
			new ApiMain( new FauxRequest( [ 'term' => 'cat' ] ) ),
			'relatedconcepts',
			$httpRequestFactory,
			WikibaseRepo::getBaseDataModelDeserializerFactory(),
			$this->createMockSnakFormatterFactory(),
			'api.php',
			[ [
				// multiple clauses
				'must not' => [
					[
						// one without item, ...
						'property' => 'P99',
					], [
						// ... one with item
						'property' => 'P1',
						'item' => 'Q99',
					],
				],
				// recursive conditions
				'conditions' => [ [
					'should' => [ [
						'property' => 'P1',
					] ],
					'result' => [ 'P1' ],
				] ],
			] ]
		);

		$api->execute();
		$response = $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );

		$this->assertEquals( [ 'query' => [ 'relatedconcepts' => [ 'Q10' ] ] ], $response );
	}

	private function createMockHttpRequestFactory( array $responses ): HttpRequestFactory {
		$requestFactory = $this->createMock( HttpRequestFactory::class );
		$requestFactory->method( 'create' )
			->willReturnCallback( function ( $uri ) use ( $responses ) {
				$request = $this->createMock( MWHttpRequest::class );
				$request
					->method( 'getContent' )
					->willReturn( json_encode( $responses[$uri] ) );
				return $request;
			} );

		return $requestFactory;
	}

	private function createMockSnakFormatterFactory(): OutputFormatSnakFormatterFactory {
		$snakFormatterFactory = $this->createMock( OutputFormatSnakFormatterFactory::class );
		$snakFormatterFactory->method( 'getSnakFormatter' )
			->willReturnCallback( function () {
				$snakFormatter = $this->createMock( SnakFormatter::class );
				$snakFormatter->method( 'formatSnak' )
					->willReturnCallback( static function ( PropertyValueSnak $snak ) {
						return $snak->getDataValue()->getValue()->getEntityId()->getSerialization();
					} );

				return $snakFormatter;
			} );

		return $snakFormatterFactory;
	}

}
