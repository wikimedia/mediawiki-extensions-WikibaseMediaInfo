<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use CirrusSearch\CirrusSearch;
use CirrusSearch\CirrusSearchHookRunner;
use CirrusSearch\Parser\AST\ParsedQuery;
use CirrusSearch\Parser\NamespacePrefixParser;
use CirrusSearch\Search\SearchQueryBuilder;
use CirrusSearch\SearchConfig;
use Elastica\Query\BoolQuery;
use MediaWiki\HookContainer\HookContainer;
use MediaWikiIntegrationTestCase;
use Wikibase\MediaInfo\Search\MediaSearchASTEntitiesExtractor;
use Wikibase\MediaInfo\Search\MediaSearchASTQueryBuilder;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaSearchASTQueryBuilder
 */
class MediaSearchASTQueryBuilderTest extends MediaWikiIntegrationTestCase {
	private function getBuilderInstance(): MediaSearchASTQueryBuilder {
		$mockMediaSearchEntitiesFetcher = $this->createMock( MediaSearchEntitiesFetcher::class );
		$mockMediaSearchEntitiesFetcher->method( 'get' )
			->willReturn( [] );

		return new MediaSearchASTQueryBuilder(
			new MediaSearchASTEntitiesExtractor( $mockMediaSearchEntitiesFetcher ),
			[],
			[],
			'',
			[]
		);
	}

	private function createParsedQuery( $queryString ): ParsedQuery {
		$searchQueryBuilder = SearchQueryBuilder::newFTSearchQueryBuilder(
			new SearchConfig(),
			$queryString,
			new class() implements NamespacePrefixParser {
				public function parse( $query ) {
					return CirrusSearch::parseNamespacePrefixes( $query, true, true );
				}
			},
			new CirrusSearchHookRunner( $this->createMock( HookContainer::class ) )
		);
		$searchQuery = $searchQueryBuilder->build();

		return $searchQuery->getParsedQuery();
	}

	public function testGetQuery() {
		$parsedQuery = $this->createParsedQuery( 'cat AND dog' );
		$query = $this->getBuilderInstance()->getQuery( $parsedQuery );
		$this->assertInstanceOf( BoolQuery::class, $query );
	}

	public function testCanonicalizeTerm() {
		$builder = $this->getBuilderInstance();
		$method = ( new \ReflectionObject( $builder ) )->getMethod( 'canonicalizeTerm' );
		$method->setAccessible( true );
		$this->assertEquals( 'abc', $method->invoke( $builder, 'abc' ) );
		$this->assertEquals( 'abc', $method->invoke( $builder, ' abc' ) );
		$this->assertEquals( 'abc', $method->invoke( $builder, 'abc ' ) );
		$this->assertEquals( 'abc', $method->invoke( $builder, ' abc ' ) );
		$this->assertEquals( 'abc', $method->invoke( $builder, 'abc.' ) );
		$this->assertEquals( 'abc', $method->invoke( $builder, '.abc.' ) );
		$this->assertEquals( 'abc', $method->invoke( $builder, '. abc.' ) );
		$this->assertEquals( 'abc', $method->invoke( $builder, ' . abc.' ) );
		$this->assertEquals( 'a b c', $method->invoke( $builder, ' . a . b . c . ' ) );
	}

	public function testFilterTermsTooShort() {
		$builder = $this->getBuilderInstance();
		$method = ( new \ReflectionObject( $builder ) )->getMethod( 'filterTermsTooShort' );
		$method->setAccessible( true );
		$this->assertEquals(
			[ 'a' => 1, 'bb' => 1, 'ccc' => 1 ],
			$method->invoke(
				$builder,
				[ 'a' => 1, 'bb' => 1, 'ccc' => 1 ],
				1
			)
		);
		$this->assertEquals(
			[ 'bb' => 1, 'ccc' => 1 ],
			$method->invoke(
				$builder,
				[ 'a' => 1, 'bb' => 1, 'ccc' => 1 ],
				2
			)
		);
		$this->assertEquals(
			[ 'ccc' => 1 ],
			$method->invoke(
				$builder,
				[ 'a' => 1, 'bb' => 1, 'ccc' => 1 ],
				3
			)
		);
	}

	public function testFilterTermsTooDissimilarCanonicalized() {
		$builder = $this->getBuilderInstance();
		$method = ( new \ReflectionObject( $builder ) )->getMethod( 'filterTermsTooDissimilarCanonicalized' );
		$method->setAccessible( true );
		$this->assertEquals(
			[ 'a test' => 1, 'A TEST' => 1, '# A test...' => 1 ],
			$method->invoke(
				$builder,
				[ 'a test' => 1, 'A TEST' => 1, '# A test...' => 1 ],
				0.5
			)
		);
		$this->assertEquals(
			[ 'a test' => 1, 'A TEST' => 1 ],
			$method->invoke(
				$builder,
				[ 'a test' => 1, 'A TEST' => 1, '# A test...' => 1 ],
				0.75
			)
		);
	}

	public function testFilterTermsTooSimilar() {
		$builder = $this->getBuilderInstance();
		$method = ( new \ReflectionObject( $builder ) )->getMethod( 'filterTermsTooSimilar' );
		$method->setAccessible( true );
		$this->assertEquals(
			[ 'this is a test' => 1, 'this is a second test' => 1, 'and a third one' => 1 ],
			$method->invoke(
				$builder,
				[ 'this is a test' => 1, 'this is a second test' => 1, 'and a third one' => 1 ],
				0.1
			)
		);
		$this->assertEquals(
			[ 'this is a test' => 1, 'and a third one' => 1 ],
			$method->invoke(
				$builder,
				[ 'this is a test' => 1, 'this is a second test' => 1, 'and a third one' => 1 ],
				0.5
			)
		);
	}

	public function testFilterTermsSupersets() {
		$builder = $this->getBuilderInstance();
		$method = ( new \ReflectionObject( $builder ) )->getMethod( 'filterTermsSupersets' );
		$method->setAccessible( true );
		$this->assertEquals(
			[ 'a test' => 1, 'and a third one' => 1 ],
			$method->invoke(
				$builder,
				[ 'a test' => 1, 'this is a second test' => 1, 'and a third one' => 1 ]
			)
		);
		$this->assertEquals(
			[ 'commons' => 1, 'commonswiki' => 1 ],
			$method->invoke(
				$builder,
				[ 'commons' => 1, 'wikimedia commons' => 1, 'commonswiki' => 1 ]
			)
		);
	}
}
