<?php

namespace Wikibase\Repo\Tests\Rdf;

use PHPUnit\Framework\TestCase;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Rdf\MediaInfoRdfBuilder;
use Wikibase\MediaInfo\Rdf\MediaInfoSpecificComponentsRdfBuilder;
use Wikibase\Repo\Rdf\DedupeBag;
use Wikibase\Repo\Rdf\EntityMentionListener;
use Wikibase\Repo\Rdf\FullStatementRdfBuilder;
use Wikibase\Repo\Rdf\FullStatementRdfBuilderFactory;
use Wikibase\Repo\Rdf\RdfProducer;
use Wikibase\Repo\Rdf\RdfVocabulary;
use Wikibase\Repo\Rdf\TermsRdfBuilder;
use Wikibase\Repo\Rdf\TruthyStatementRdfBuilder;
use Wikibase\Repo\Rdf\TruthyStatementRdfBuilderFactory;
use Wikibase\Repo\Rdf\ValueSnakRdfBuilderFactory;
use Wikimedia\Purtle\RdfWriter;

/**
 * @covers Wikibase\MediaInfo\Rdf\MediaInfoRdfBuilder
 *
 * @group WikibaseRdf
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoRdfBuilderTest extends TestCase {

	private $dedupe;
	private $vocabulary;
	private $writer;
	private $mentionedEntityTracker;
	private $valueSnakRdfBuilderFactory;
	private $termsRdfBuilder;
	private $truthyStatementRdfBuilderFactory;
	private $fullStatementRdfBuilderFactory;

	public function setUp(): void {
		parent::setUp();
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

	public function provideAddEntity(): array {
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

}
