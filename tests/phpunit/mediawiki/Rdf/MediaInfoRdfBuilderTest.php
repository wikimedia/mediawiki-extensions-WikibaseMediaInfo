<?php

namespace Wikibase\Repo\Tests\Rdf;

use InvalidArgumentException;
use MediaWiki\Revision\SlotRecord;
use PHPUnit\Framework\MockObject\MockObject;
use Wikibase\DataAccess\DatabaseEntitySource;
use Wikibase\DataAccess\EntitySourceDefinitions;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\PropertyInfoLookup;
use Wikibase\Lib\SubEntityTypesMapper;
use Wikibase\Lib\Tests\Store\MockPropertyInfoLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Rdf\MediaInfoRdfBuilder;
use Wikibase\MediaInfo\Rdf\MediaInfoSpecificComponentsRdfBuilder;
use Wikibase\Repo\Content\EntityContentFactory;
use Wikibase\Repo\Rdf\DedupeBag;
use Wikibase\Repo\Rdf\EntityMentionListener;
use Wikibase\Repo\Rdf\EntityStubRdfBuilderFactory;
use Wikibase\Repo\Rdf\FullStatementRdfBuilder;
use Wikibase\Repo\Rdf\FullStatementRdfBuilderFactory;
use Wikibase\Repo\Rdf\HashDedupeBag;
use Wikibase\Repo\Rdf\RdfBuilder;
use Wikibase\Repo\Rdf\RdfProducer;
use Wikibase\Repo\Rdf\RdfVocabulary;
use Wikibase\Repo\Rdf\TermsRdfBuilder;
use Wikibase\Repo\Rdf\TruthyStatementRdfBuilder;
use Wikibase\Repo\Rdf\TruthyStatementRdfBuilderFactory;
use Wikibase\Repo\Rdf\ValueSnakRdfBuilderFactory;
use Wikibase\Repo\WikibaseRepo;
use Wikimedia\Purtle\RdfWriter;

/**
 * @covers Wikibase\MediaInfo\Rdf\MediaInfoRdfBuilder
 *
 * @group WikibaseRdf
 * @group Database
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoRdfBuilderTest extends \MediaWikiIntegrationTestCase {

	/** @var DedupeBag&MockObject */
	private $dedupe;
	/** @var RdfVocabulary&MockObject */
	private $vocabulary;
	/** @var RdfWriter&MockObject */
	private $writer;
	/** @var EntityMentionListener&MockObject */
	private $mentionedEntityTracker;
	/** @var ValueSnakRdfBuilderFactory&MockObject */
	private $valueSnakRdfBuilderFactory;
	/** @var TermsRdfBuilder&MockObject */
	private $termsRdfBuilder;
	/** @var TruthyStatementRdfBuilderFactory&MockObject */
	private $truthyStatementRdfBuilderFactory;
	/** @var FullStatementRdfBuilderFactory&MockObject */
	private $fullStatementRdfBuilderFactory;

	/**
	 * @var NTriplesRdfTestHelper
	 */
	private $helper;
	/** @var MediaInfoSpecificComponentsRdfBuilder&MockObject */
	private $mediaInfoSpecificComponentsRdfBuilder;

	protected function setUp(): void {
		parent::setUp();

		$testData = new RdfBuilderTestData(
			__DIR__ . '/../../data/entities',
			__DIR__ . '/../../data/MediaInfoSpecificComponentsRdfBuilder'
		);

		$this->helper = new NTriplesRdfTestHelper( $testData );
		$this->dedupe = $this->createMock( DedupeBag::class );
		$this->vocabulary = $this->createMock( RdfVocabulary::class );
		$this->writer = $this->createMock( RdfWriter::class );
		$this->mentionedEntityTracker = $this->createMock( EntityMentionListener::class );
		$this->valueSnakRdfBuilderFactory = $this->createMock( ValueSnakRdfBuilderFactory::class );
		$this->termsRdfBuilder = $this->createMock( TermsRdfBuilder::class );
		$this->truthyStatementRdfBuilderFactory = $this->createMock( TruthyStatementRdfBuilderFactory::class );
		$this->fullStatementRdfBuilderFactory = $this->createMock( FullStatementRdfBuilderFactory::class );
		$this->mediaInfoSpecificComponentsRdfBuilder =
			$this->createMock( MediaInfoSpecificComponentsRdfBuilder::class );

		$this->setService( 'WikibaseRepo.PropertyInfoLookup', $testData->getPropertyInfoLookup() );
	}

	/**
	 * @dataProvider provideAddEntity
	 */
	public function testInternalRdfBuildersCallsAddEntity_dependingOnFlavorFlags(
		int $flavorFlags,
		MediaInfo $mediainfo,
		bool $expectTruthyBuilderCalled = false,
		bool $expectFullBuilderCalled = false
	): void {
		$this->termsRdfBuilder->expects( $this->atLeastOnce() )->method( 'addEntity' )->with( $mediainfo );
		$this->mediaInfoSpecificComponentsRdfBuilder
			->expects( $this->atLeastOnce() )
			->method( 'addEntity' )
			->with( $mediainfo );

		$truthyStatementRdfBuilder = $this->createMock( TruthyStatementRdfBuilder::class );
		$this->truthyStatementRdfBuilderFactory
			->method( 'getTruthyStatementRdfBuilder' )
			->willReturn( $truthyStatementRdfBuilder );
		if ( $expectTruthyBuilderCalled ) {
			$truthyStatementRdfBuilder->expects( $this->atLeastOnce() )->method( 'addEntity' )->with( $mediainfo );
		} else {
			$truthyStatementRdfBuilder->expects( $this->never() )->method( 'addEntity' );
		}

		$fullStatementRdfBuilder = $this->createMock( FullStatementRdfBuilder::class );
		$this->fullStatementRdfBuilderFactory
			->method( 'getFullStatementRdfBuilder' )
			->willReturn( $fullStatementRdfBuilder );
		if ( $expectFullBuilderCalled ) {
			$fullStatementRdfBuilder->expects( $this->atLeastOnce() )->method( 'addEntity' )->with( $mediainfo );
		} else {
			$fullStatementRdfBuilder->expects( $this->never() )->method( 'addEntity' );
		}

		$builder = $this->getBuilder( $flavorFlags );
		$builder->addEntity( $mediainfo );
	}

	public static function provideAddEntity(): array {
		return [
			"No flavors selected" => [ 0, new MediaInfo( new MediaInfoId( 'M1' ) ) ],
			"Just truthy statements requested" => [
				RdfProducer::PRODUCE_TRUTHY_STATEMENTS,
				new MediaInfo( new MediaInfoId( 'M1' ) ),
				true,
				false
			],
			"Full statements requested" => [
				RdfProducer::PRODUCE_ALL_STATEMENTS,
				new MediaInfo( new MediaInfoId( 'M1' ) ),
				false,
				true
			],
			"All statements requested" => [
				RdfProducer::PRODUCE_ALL,
				new MediaInfo( new MediaInfoId( 'M1' ) ),
				true,
				true
			],
		];
	}

	private function getBuilder( $flavorFlags ): MediaInfoRdfBuilder {
		return new MediaInfoRdfBuilder(
			$flavorFlags,
			$this->termsRdfBuilder,
			$this->truthyStatementRdfBuilderFactory,
			$this->fullStatementRdfBuilderFactory,
			$this->mediaInfoSpecificComponentsRdfBuilder
		);
	}

	private function getVocabulary(): RdfVocabulary {
		return new RdfVocabulary(
			[ 'test' => 'http://acme.test/' ],
			[ 'test' => '' ],
			new EntitySourceDefinitions(
				[
					new DatabaseEntitySource(
						'test',
						'testdb',
						[
							'item' => [ 'namespaceId' => 100, 'slot' => SlotRecord::MAIN ],
							'property' => [ 'namespaceId' => 200, 'slot' => SlotRecord::MAIN ],
							'mediainfo' => [ 'namespaceId' => 700, 'slot' => 'mediainfo' ],
						],
						'http://acme.test/',
						'',
						'',
						''
					),
				],
				new SubEntityTypesMapper( [] )
			),
			[ 'test' => '' ],
			[ 'test' => '' ],
			[],
			[],
			[],
			'http://creativecommons.org/publicdomain/zero/1.0/'
		);
	}

	/**
	 * Initialize repository data
	 *
	 * @return RdfBuilderTestData
	 */
	private function getTestData() {
		return $this->helper->getTestData();
	}

	/**
	 * @param RdfWriter $writer
	 * @param int $produce One of the RdfProducer::PRODUCE_... constants.
	 *
	 * @return RdfBuilder
	 */
	private function newFullBuilder(
		RdfWriter $writer, $produce
	) {
		$builder = new RdfBuilder(
			$this->getVocabulary(),
			WikibaseRepo::getEntityRdfBuilderFactory(),
			$produce,
			$writer,
			new HashDedupeBag(),
			$this->createMock( EntityContentFactory::class ),
			$this->createMock( EntityStubRdfBuilderFactory::class ),
			$this->createMock( EntityRevisionLookup::class )
		);
		$builder->startDocument();
		return $builder;
	}

	public static function provideMediaInfoFullRDF() {
		return [
			[ 'M1', 'M1_full' ],
		];
	}

	/**
	 * @dataProvider provideMediaInfoFullRDF
	 */
	public function testMediaInfoFullRDF( $entityName, $dataSetName ) {
		$propertyInfo = [ 'P180' => [ PropertyInfoLookup::KEY_DATA_TYPE => 'wikibase-item' ] ];
		$propertyInfoLookup = new MockPropertyInfoLookup( $propertyInfo );
		$this->setService( 'WikibaseRepo.PropertyInfoLookup', $propertyInfoLookup );

		$entity = $this->getTestData()->getEntity( $entityName );
		$writer = $this->getTestData()->getNTriplesWriter( false );

		$builder = $this->newFullBuilder( $writer, RdfProducer::PRODUCE_ALL );
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
