<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Rdf;

use File;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use RepoGroup;
use Wikibase\DataAccess\DatabaseEntitySource;
use Wikibase\DataAccess\EntitySourceDefinitions;
use Wikibase\Lib\SubEntityTypesMapper;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Rdf\MediaInfoSpecificComponentsRdfBuilder;
use Wikibase\Repo\Rdf\RdfVocabulary;
use Wikibase\Repo\Tests\Rdf\NTriplesRdfTestHelper;
use Wikibase\Repo\Tests\Rdf\RdfBuilderTestData;
use Wikimedia\Purtle\RdfWriter;

/**
 * @covers \Wikibase\MediaInfo\Rdf\MediaInfoSpecificComponentsRdfBuilder
 *
 * @group WikibaseRdf
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoSpecificComponentsRdfBuilderTest extends TestCase {

	/**
	 * @var NTriplesRdfTestHelper
	 */
	private $helper;

	/**
	 * @var RdfBuilderTestData|null
	 */
	private $testData = null;

	protected function setUp(): void {
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
				__DIR__ . '/../../data/MediaInfoSpecificComponentsRdfBuilder'
			);
		}

		return $this->testData;
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
							'item' => [ 'namespaceId' => 100, 'slot' => 'main' ],
							'property' => [ 'namespaceId' => 200, 'slot' => 'main' ],
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
	 * @param RdfWriter $writer
	 * @param MediaInfoHandler $handler
	 * @param RepoGroup $repoGroup
	 * @return MediaInfoSpecificComponentsRdfBuilder
	 */
	private function newBuilderWithFile( RdfWriter $writer, MediaInfoHandler $handler, RepoGroup $repoGroup ) {
		$vocabulary = $this->getVocabulary();
		$builder = new MediaInfoSpecificComponentsRdfBuilder( $vocabulary, $writer, $handler, $repoGroup );
		$writer->start();
		return $builder;
	}

	public function provideMediaInfoPartialRDFWithFile() {
		return [
			[ 'M1', 'M1_base', null ],
			[ 'M1', 'M1_jpg', new FileMock( 'Test.jpg', [
				'canonicalUrl' => 'http://example.com/Test.jpg',
				'mediaType' => MEDIATYPE_BITMAP,
				'mimeType' => 'image/jpeg',
				'size' => 123445,
				'height' => 1024,
				'width' => 2048,
			] ) ],
			[ 'M1', 'M1_svg', new FileMock( 'Test.svg', [
				'canonicalUrl' => 'http://example.com/Test.svg',
				'mediaType' => MEDIATYPE_DRAWING,
				'mimeType' => 'image/svg+xml',
			] ) ],
			[ 'M1', 'M1_pdf', new FileMock( 'Test.pdf', [
				'canonicalUrl' => 'http://example.com/Test.pdf',
				'mimeType' => 'application/pdf',
				'pageCount' => 10,
			] ) ],
			[ 'M1', 'M1_ogg', new FileMock( 'Test.ogg', [
				'canonicalUrl' => 'http://example.com/Test.ogg',
				'mediaType' => MEDIATYPE_AUDIO,
				'mimeType' => 'audio/ogg',
				'length' => 60.3,
			] ) ],
			[ 'M1', 'M1_webm', new FileMock( 'Test.webm', [
				'canonicalUrl' => 'http://example.com/Test.webm',
				'mediaType' => MEDIATYPE_VIDEO,
				'mimeType' => 'video/webm',
				'length' => 60.30,
			] ) ],
		];
	}

	/**
	 * @dataProvider provideMediaInfoPartialRDFWithFile
	 */
	public function testMediaInfoPartialRDFWithFile( $entityName, $dataSetName, File $file = null ) {
		if ( $file && !$file->getHandler() ) {
			$this->markTestSkipped( 'No MediaHandler registered for ' . $file->getMimeType() );
		}

		$entity = $this->getTestData()->getEntity( $entityName );
		$writer = $this->getTestData()->getNTriplesWriter( false );
		$handler = $this->createMock( MediaInfoHandler::class );
		$handler->expects( $this->once() )
			->method( 'getTitleForId' )
			->with( $entity->getId() )
			->willReturn( ( $file === null ) ? null : $file->getTitle() );

		$repoGroup = $this->createMock( RepoGroup::class );
		if ( $file === null ) {
			$repoGroup->expects( $this->never() )
				->method( 'findFile' );
		} else {
			$repoGroup->expects( $this->once() )
				->method( 'findFile' )
				->with( $file->getTitle() )
				->willReturn( $file );
		}

		$builder = $this->newBuilderWithFile( $writer, $handler, $repoGroup );
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
