<?php

namespace Wikibase\MediaInfo\Tests\Unit\Search\LTRParamBuilder;

use Elastica\Query\AbstractQuery;
use MediaWikiUnitTestCase;
use Wikibase\MediaInfo\Search\LTRParamBuilder\MediaSearch20210826 as SUT;

/**
 * @coversDefaultClass \Wikibase\MediaInfo\Search\LTRParamBuilder\MediaSearch20210826
 */
class MediaSearch20210826Test extends MediaWikiUnitTestCase {

	/** @var AbstractQuery */
	private $query;

	public function setup(): void {
		parent::setup();
		$this->query = $this->createStub( AbstractQuery::class );
	}

	/**
	 * @covers ::getModelParams
	 * @dataProvider modelParamProvider
	 */
	public function testGetModelParams(
		array $originalQueryAsArray, string $langCode, array $expected
	) {
		$sut = new SUT();
		$this->query->method( 'toArray' )
			->willReturn( $originalQueryAsArray );
		$this->assertArrayEquals(
			$sut->getModelParams( $this->query, $langCode ),
			$expected
		);
	}

	public function modelParamProvider(): array {
		$params = [
			'' => [
				'originalQueryAsArray' => [
					'ignore' => 'text to ignore',
					'query' => 'text_search_term_1',
					[
						'ignore' => 'text to ignore',
						// duplicate term ignored
						'query' => 'text_search_term_1',
					],
					[
						'ignore' => 'text to ignore',
						// non-duplicate term appended
						'query' => 'text_search_term_2',
					],
					[
						// irrelevant statement ignored
						'query' => 'P111=Q222',
						[
							'query' => SUT::DEPICTS . '=Q999',
						],
						[
							'query' => SUT::DEPICTS . '=Q888',
						],
						[
							[
								'query' => SUT::DIGITAL_REPRESENTATION_OF . '=Q555',
							],
							[
								'query' => SUT::DIGITAL_REPRESENTATION_OF . '=Q444',
							],
						]
					]
				],
				'langCode' => 'qqq',
				'expected' => [
					'language' => 'qqq',
					'text_search_term' => 'text_search_term_1 text_search_term_2',
					'Depicts_1' => SUT::DEPICTS . '=Q999',
					'Depicts_2' => SUT::DEPICTS . '=Q888',
					'DigRepOf_1' => SUT::DIGITAL_REPRESENTATION_OF . '=Q555',
					'DigRepOf_2' => SUT::DIGITAL_REPRESENTATION_OF . '=Q444',
				],
			]
		];

		// If the full array hasn't been provided in 'expected' then pad it out
		$fullExpected = [
			'language' => 'DEFAULT_LANGUAGE',
			'text_search_term' => '',
		];
		for ( $i = 1; $i <= 50; $i++ ) {
			$fullExpected['DigRepOf_' . $i] = SUT::DIGITAL_REPRESENTATION_OF . '=NO_ENTITY';
			$fullExpected['Depicts_' . $i] = SUT::DEPICTS . '=NO_ENTITY';
		}
		foreach ( $params as $index => $paramSet ) {
			$params[$index]['expected'] = array_merge( $fullExpected, $params[$index]['expected'] );
		}

		return $params;
	}
}
