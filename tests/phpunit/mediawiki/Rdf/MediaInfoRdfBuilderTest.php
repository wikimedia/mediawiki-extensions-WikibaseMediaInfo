<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Rdf;

use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use PHPUnit4And6Compat;
use Wikibase\Lib\Store\EntityTitleLookup;
use Wikibase\Rdf\HashDedupeBag;
use Wikibase\Rdf\RdfBuilder;
use Wikibase\Rdf\RdfProducer;
use Wikibase\Repo\Tests\Rdf\NTriplesRdfTestHelper;
use Wikibase\Repo\Tests\Rdf\RdfBuilderTestData;
use Wikibase\Repo\WikibaseRepo;
use Wikimedia\Purtle\RdfWriter;

/**
 * @covers \Wikibase\MediaInfo\Rdf\MediaInfoRdfBuilder
 *
 * @group WikibaseRdf
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoRdfBuilderTest extends TestCase {
	use PHPUnit4And6Compat;

	/**
	 * @var NTriplesRdfTestHelper
	 */
	private $helper;

	/**
	 * @var RdfBuilderTestData|null
	 */
	private $testData = null;

	protected function setUp() {
		parent::setUp();
		$this->helper = new NTriplesRdfTestHelper();
	}

	/**
	 * Initialize repository data
	 *
	 * @return RdfBuilderTestData
	 */
	private function getTestData() {
		if ( $this->testData === null ) {
			$this->testData = new RdfBuilderTestData(
				__DIR__ . '/../../data/entities',
				__DIR__ . '/../../data/MediaInfoRdfBuilder'
			);
		}

		return $this->testData;
	}

	/**
	 * @param RdfWriter $writer
	 * @param int $produce One of the RdfProducer::PRODUCE_... constants.
	 * @param EntityTitleLookup $entityTitleLookup
	 *
	 * @return RdfBuilder
	 */
	private function newFullBuilder(
		RdfWriter $writer, $produce, EntityTitleLookup $entityTitleLookup
	) {
		$wikibaseRepo = WikibaseRepo::getDefaultInstance();
		$builder = new RdfBuilder(
			$this->getTestData()->getSiteLookup()->getSites(),
			$this->getTestData()->getVocabulary(),
			$wikibaseRepo->getValueSnakRdfBuilderFactory(),
			$this->getTestData()->getMockRepository(),
			$wikibaseRepo->getEntityRdfBuilderFactory(),
			$produce,
			$writer,
			new HashDedupeBag(),
			$entityTitleLookup
		);
		$builder->startDocument();
		return $builder;
	}

	public function provideMediaInfoRDF() {
		return [
			[ 'M1', 'M1_full' ],
		];
	}

	/**
	 * @dataProvider provideMediaInfoRDF
	 */
	public function testMediaInfoRDF( $entityName, $dataSetName ) {
		$entity = $this->getTestData()->getEntity( $entityName );
		$writer = $this->getTestData()->getNTriplesWriter( false );
		$entityTitleLookup = $this->getMock( EntityTitleLookup::class );

		$builder = $this->newFullBuilder( $writer, RdfProducer::PRODUCE_ALL, $entityTitleLookup );
		$builder->addEntity( $entity );
		$this->assertOrCreateNTriples( $dataSetName, $writer );
	}

	private function assertOrCreateNTriples( $dataSetName, RdfWriter $writer ) {
		$actual = $writer->drain();
		try {
			$expected = $this->getTestData()->getNTriples( $dataSetName );
		} catch ( InvalidArgumentException $e ) {
			$this->getTestData()->putTestData( $dataSetName, $actual, '.actual' );
			$this->fail( "Data set $dataSetName not found! Created file with the current data "
							. 'using the suffix .actual' );

		}

		$this->helper->assertNTriplesEquals( $expected, $actual, "Data set $dataSetName" );
	}

}
