<?php

namespace extensions\WikibaseMediaInfo\tests\phpunit\unit;

use MediaWiki\Content\ContentHandlerFactory;
use MediaWiki\HookContainer\HookContainer;
use MediaWiki\Page\PageStore;
use MediaWiki\Revision\RevisionRecord;
use Psr\Log\LoggerInterface;
use Wikibase\DataModel\Entity\ItemIdParser;
use Wikibase\DataModel\Services\Lookup\PropertyDataTypeLookup;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\MediaInfoDataForSearchIndex;
use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\Repo\Content\EntityInstanceHolder;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\StatementProviderFieldDefinitions;
use Wikimedia\ObjectFactory\ObjectFactory;
use Wikimedia\Services\ServiceContainer;

class MediaInfoDataForSearchIndexTest extends \MediaWikiUnitTestCase {
	/**
	 * @covers \Wikibase\MediaInfo\MediaInfoDataForSearchIndex::onSearchDataForIndex2
	 */
	public function test() {
		$contentHandlerFactory = new ContentHandlerFactory(
			[
				MediaInfoContent::CONTENT_MODEL_ID => [
					'factory' => function () {
						return $this->createHandler();
					},
					'class' => MediaInfoHandler::class ]
			],
			new ObjectFactory( $this->createMock( ServiceContainer::class ) ),
			$this->createMock( HookContainer::class ),
			$this->createMock( LoggerInterface::class )
		);

		$content = new MediaInfoContent( new EntityInstanceHolder( $this->createEntity() ) );
		$revision = $this->createMock( RevisionRecord::class );
		$revision->method( 'hasSlot' )
			->with( MediaInfo::ENTITY_TYPE )
			->willReturn( true );
		$revision->method( 'getContent' )
			->with( MediaInfo::ENTITY_TYPE )
			->willReturn( $content );

		$hook = new MediaInfoDataForSearchIndex( $contentHandlerFactory );
		$fields = [ 'my_data' => 'should remain here' ];
		$hook->onSearchDataForIndex2(
			$fields,
			$this->createMock( \ContentHandler::class ),
			$this->createMock( \WikiPage::class ),
			$this->createMock( \ParserOutput::class ),
			$this->createMock( \SearchEngine::class ),
			$revision
		);
		// Here we mainly test that the entity "labels" (captions for MediaInfo) are written as
		// descriptions in the index document.
		$expectedFields = [
			'my_data' => 'should remain here',
			'label_count' => 0,
			'labels' => null,
			'labels_all' => null,
			'descriptions' => [
				'ar' => [ 'شعبي جزائري (موسيقى)' ],
				'en' => [ 'Chaabi (Algeria)' ]
			],
			'statement_keywords' => [],
			'statement_count' => 0
		];
		$this->assertEquals( $expectedFields, $fields );
	}

	private function createEntity(): MediaInfo {
		$id = new MediaInfoId( 'M123' );
		$labels = new TermList( [
			new Term( 'ar', 'شعبي جزائري (موسيقى)' ),
			new Term( 'en', 'Chaabi (Algeria)' )
		] );
		$descriptions = new TermList();
		$statements = new StatementList();

		return new MediaInfo( $id, $labels, $descriptions, $statements );
	}

	private function createHandler(): MediaInfoHandler {
		return new MediaInfoHandler(
			$this->createMock( EntityContentDataCodec::class ),
			$this->createMock( EntityConstraintProvider::class ),
			$this->createMock( ValidatorErrorLocalizer::class ),
			new ItemIdParser(),
			$this->createMock( MissingMediaInfoHandler::class ),
			$this->createMock( MediaInfoIdLookup::class ),
			$this->createMock( FilePageLookup::class ),
			new MediaInfoFieldDefinitions(
				new LabelsProviderFieldDefinitions( [ 'ar', 'en' ] ),
				new DescriptionsProviderFieldDefinitions( [ 'ar', 'en' ], [] ),
				new StatementProviderFieldDefinitions(
					$this->createMock( PropertyDataTypeLookup::class ),
					[],
					[],
					[],
					[],
					[]
				)
			),
			$this->createMock( PageStore::class ),
			$this->createMock( \TitleFactory::class ),
			null
		);
	}
}
