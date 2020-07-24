<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use Action;
use Article;
use Closure;
use FauxRequest;
use IContextSource;
use Language;
use MediaWiki\Storage\RevisionRecord;
use RequestContext;
use Title;
use Wikibase\Client\Store\UsageUpdater;
use Wikibase\Client\Usage\EntityUsage;
use Wikibase\Content\EntityInstanceHolder;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\ItemIdParser;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\LanguageFallbackLabelDescriptionLookupFactory;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\Repo\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Store\EntityIdLookup;
use Wikibase\TermIndex;

/**
 * @covers \Wikibase\MediaInfo\Content\MediaInfoHandler
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoHandlerTest extends \PHPUnit\Framework\TestCase {

	use \PHPUnit4And6Compat;

	private function getMockWithoutConstructor( $className ) {
		return $this->getMockBuilder( $className )
			->disableOriginalConstructor()
			->getMock();
	}

	private function newMediaInfoHandler( array $replacements = [] ) {
		$m17 = new MediaInfoId( 'M17' );

		$labelLookupFactory = $this->getMockWithoutConstructor(
			LanguageFallbackLabelDescriptionLookupFactory::class
		);
		$labelLookupFactory->expects( $this->any() )
			->method( 'newLabelDescriptionLookup' )
			->will( $this->returnValue( $this->getMock( LabelDescriptionLookup::class ) ) );

		$missingMediaInfoHandler = $this->getMockWithoutConstructor(
			MissingMediaInfoHandler::class
		);
		$missingMediaInfoHandler->expects( $this->any() )
			->method( 'getMediaInfoId' )
			->will( $this->returnValue( $m17 ) );
		$missingMediaInfoHandler->expects( $this->any() )
			->method( 'showVirtualMediaInfo' )
			->will( $this->returnCallback(
				function( MediaInfoId $id, IContextSource $context ) {
					$context->getOutput()->addHTML( 'MISSING!' );
				}
			) );

		$filePageLookup = $this->getMockWithoutConstructor( FilePageLookup::class );
		$filePageLookup->expects( $this->any() )
			->method( 'getFilePage' )
			->will( $this->returnCallback( function( MediaInfoId $id ) {
				if ( $id->getSerialization() !== 'M1' ) {
					return null;
				}

				return Title::makeTitle( NS_FILE, 'Test-' . $id->getSerialization() . '.png' );
			} ) );

		$mockUsageUpdater = $this->getMockBuilder( UsageUpdater::class )
			->disableOriginalConstructor()
			->getMock();

		return new MediaInfoHandler(
			$this->getMock( TermIndex::class ),
			$this->getMockWithoutConstructor( EntityContentDataCodec::class ),
			$this->getMockWithoutConstructor( EntityConstraintProvider::class ),
			$this->getMock( ValidatorErrorLocalizer::class ),
			new ItemIdParser(),
			$this->getMock( EntityIdLookup::class ),
			$labelLookupFactory,
			$missingMediaInfoHandler,
			!empty( $replacements[ 'filePageLookup' ] )
				? $replacements[ 'filePageLookup' ] : $filePageLookup,
			new MediaInfoFieldDefinitions(
				new LabelsProviderFieldDefinitions( [ 'ar', 'de' ] ),
				new DescriptionsProviderFieldDefinitions( [ 'ar', 'de' ], [] )
			),
			!empty( $replacements[ 'usageUpdater' ] )
				? $replacements[ 'usageUpdater' ] : $mockUsageUpdater,
			null
		);
	}

	public function testGetActionOverrides() {
		$mediaInfoHandler = $this->newMediaInfoHandler();
		$overrides = $mediaInfoHandler->getActionOverrides();

		$this->assertSame( [ 'history', 'view', 'edit', 'submit' ], array_keys( $overrides ) );

		$this->assertActionOverride( $overrides['history'] );
		$this->assertActionOverride( $overrides['view'] );
		$this->assertActionOverride( $overrides['edit'] );
		$this->assertActionOverride( $overrides['submit'] );
	}

	private function assertActionOverride( $override ) {
		if ( $override instanceof Closure ) {
			$context = $this->getMock( IContextSource::class );
			$context->expects( $this->any() )
				->method( 'getLanguage' )
				->will( $this->returnValue( $this->getMockWithoutConstructor( Language::class ) ) );

			$article = $this->getMockBuilder( Article::class )
				->disableOriginalConstructor()
				->getMock();

			$action = $override( $article, $context );
			$this->assertInstanceOf( Action::class, $action );
		} else {
			$this->assertTrue( is_subclass_of( $override, Action::class ) );
		}
	}

	public function testMakeEmptyEntity() {
		$mediaInfoHandler = $this->newMediaInfoHandler();

		$this->assertEquals( new MediaInfo(), $mediaInfoHandler->makeEmptyEntity() );
	}

	public function testMakeEntityId() {
		$mediaInfoHandler = $this->newMediaInfoHandler();

		$this->assertEquals( new MediaInfoId( 'M1' ), $mediaInfoHandler->makeEntityId( 'M1' ) );
	}

	public function testGetEntityType() {
		$mediaInfoHandler = $this->newMediaInfoHandler();

		$this->assertSame( MediaInfo::ENTITY_TYPE, $mediaInfoHandler->getEntityType() );
	}

	public function testShowMissingEntity() {
		$mediaInfoHandler = $this->newMediaInfoHandler();

		$title = Title::makeTitle( 112, 'M11' );
		$context = new RequestContext( new FauxRequest() );
		$context->setTitle( $title );

		$mediaInfoHandler->showMissingEntity( $title, $context );

		$html = $context->getOutput()->getHTML();
		$this->assertContains( 'MISSING!', $html );
	}

	public function testAllowAutomaticIds() {
		$mediaInfoHandler = $this->newMediaInfoHandler();

		$this->assertFalse( $mediaInfoHandler->allowAutomaticIds() );
	}

	public function provideCanCreateWithCustomId() {
		return [
			'id matches existing file page' => [ new MediaInfoId( 'M1' ), true ],
			'id does not match existing file page' => [ new MediaInfoId( 'M17' ), false ],
		];
	}

	/**
	 * @dataProvider provideCanCreateWithCustomId
	 */
	public function testCanCreateWithCustomId( EntityId $id, $expected ) {
		$mediaInfoHandler = $this->newMediaInfoHandler();

		$this->assertSame( $expected, $mediaInfoHandler->canCreateWithCustomId( $id ) );
	}

	public function testGetDataForFilePageSearchIndex() {
		$testRevisionId = 999;

		$content = new MediaInfoContent(
			new EntityInstanceHolder(
				new MediaInfo(
					new MediaInfoId( 'M1' )
				)
			)
		);

		$mockRevision = $this->getMockBuilder( RevisionRecord::class )
			->disableOriginalConstructor()
			->getMock();
		$mockRevision->expects( $this->atLeastOnce() )
			->method( 'getId' )
			->willReturn( $testRevisionId );

		$mockPage = $this->getMockBuilder( \WikiPage::class )
			->disableOriginalConstructor()
			->getMock();
		$mockPage->expects( $this->atLeastOnce() )
			->method( 'getContent' )
			->willReturn( $content );
		$mockPage->expects( $this->atLeastOnce() )
			->method( 'getRevision' )
			->willReturn( $mockRevision );

		$data = $this->newMediaInfoHandler()
			->getDataForFilePageSearchIndex(
				$mockPage,
				new \ParserOutput(),
				new \CirrusSearch()
			);

		$this->assertArrayHasKey( MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_TEXT, $data );
		$this->assertArrayHasKey( MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION, $data );
		$this->assertEquals(
			$testRevisionId,
			$data[ MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION ]
		);
		$this->assertArrayHasKey( 'labels', $data );
		$this->assertArrayNotHasKey( 'text', $data );
	}

	public function testGetEntityModificationUpdates() {
		$testArticleId = '999';
		$testEntityId = new MediaInfoId( 'M999' );

		// Create expectations for the calls made by the MediaInfoHandler
		$mockFilePage = $this->getMockBuilder( Title::class )
			->disableOriginalConstructor()
			->getMock();
		$mockFilePage->method( 'getArticleID' )
			->willReturn( $testArticleId );

		$mockFilePageLookup = $this->getMockBuilder( FilePageLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$mockFilePageLookup->method( 'getFilePage' )
			->with( $testEntityId )
			->willReturn( $mockFilePage );

		// This is the key part of the test - making sure that addUsagesForPage
		// is called on the UsageUpdater with the right data
		$mockUsageUpdater = $this->getMockBuilder( UsageUpdater::class )
			->disableOriginalConstructor()
			->getMock();
		$mockUsageUpdater->expects( $this->once() )
			->method( 'addUsagesForPage' )
			->with(
				$testArticleId,
				$this->callback( function( $usageArray ) use ( $testEntityId ) {
					if ( !is_array( $usageArray ) ) {
						return false;
					}
					if ( count( $usageArray ) != 1 ) {
						return false;
					}
					$usage = $usageArray[0];
					if ( $usage->getEntityId() != $testEntityId ) {
						return false;
					}
					if ( $usage->getAspect() != EntityUsage::ALL_USAGE ) {
						return false;
					}
					return true;
				} )
			);

		// Create the SUT with the mocked dependencies containing the expectations
		$mediaInfoHandler = $this->newMediaInfoHandler(
			[
				'filePageLookup' => $mockFilePageLookup,
				'usageUpdater' => $mockUsageUpdater
			]
		);

		$entityContent = new MediaInfoContent(
			new EntityInstanceHolder(
				new MediaInfo(
					$testEntityId
				)
			)
		);
		$updates = $mediaInfoHandler->getEntityModificationUpdates(
			$entityContent,
			new \Title()
		);

		$this->assertGreaterThanOrEqual( 1, count( $updates ) );

		foreach ( $updates as $update ) {
			$update->doUpdate();
		}
	}

	public function testGetEntityModificationUpdateWithMissingFilePage() {
		$mockFilePageLookup = $this->getMockBuilder( FilePageLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$mockFilePageLookup->method( 'getFilePage' )
			->willReturn( null );

		$mockUsageUpdater = $this->getMockBuilder( UsageUpdater::class )
			->disableOriginalConstructor()
			->getMock();
		$mockUsageUpdater->expects( $this->never() )
			->method( 'addUsagesForPage' );

		// Create the SUT with the mocked objects containing the expectations
		$mediaInfoHandler = $this->newMediaInfoHandler(
			[
				'filePageLookup' => $mockFilePageLookup,
				'usageUpdater' => $mockUsageUpdater
			]
		);

		$entityContent = new MediaInfoContent(
			new EntityInstanceHolder(
				new MediaInfo(
					new MediaInfoId( 'M999' )
				)
			)
		);
		$updates = $mediaInfoHandler->getEntityModificationUpdates(
			$entityContent,
			new \Title()
		);

		$this->assertGreaterThanOrEqual( 1, count( $updates ) );

		foreach ( $updates as $update ) {
			$update->doUpdate();
		}
	}

}
