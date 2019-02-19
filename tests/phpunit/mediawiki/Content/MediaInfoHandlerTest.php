<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use FauxRequest;
use IContextSource;
use PHPUnit4And6Compat;
use RequestContext;
use Title;
use Wikibase\Client\Store\UsageUpdater;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\ItemIdParser;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\DataModel\Services\Lookup\PropertyDataTypeLookup;
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
use Wikibase\Repo\Search\Fields\FieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\StatementProviderFieldDefinitions;
use Wikibase\Repo\Search\Fields\WikibaseIndexField;
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
	use PHPUnit4And6Compat;

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

		$propertyLookup = $this->getMock( PropertyDataTypeLookup::class );
		$propertyLookup->expects( $this->any() )
			->method( 'getDataTypeIdForProperty' )
			->willReturn( 'string' );

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
				new DescriptionsProviderFieldDefinitions( [ 'ar', 'de' ], [] ),
				new StatementProviderFieldDefinitions(
					$propertyLookup,
					[],
					[],
					[],
					[],
					[]
				)
			),
			!empty( $replacements[ 'usageUpdater' ] )
				? $replacements[ 'usageUpdater' ] : $mockUsageUpdater,
			null
		);
	}

	public function testGetActionOverrides() {
		$mediaInfoHandler = $this->newMediaInfoHandler();
		$overrides = $mediaInfoHandler->getActionOverrides();

		// We should not over-ride anything
		$this->assertSame( [], array_keys( $overrides ) );
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

	public function testGetSlotDataForSearchIndex() {
		$textForSearchIndex = 'TEXT_FOR_SEARCH_INDEX';
		$fieldName = 'TEST_FIELD_NAME';
		$fieldData = 'TEST_FIELD_DATA';

		$mediaInfo = $this->getMockBuilder( MediaInfo::class )
			->disableOriginalConstructor()
			->getMock();

		$content = $this->getMockBuilder( MediaInfoContent::class )
			->disableOriginalConstructor()
			->getMock();
		$content->method( 'getEntity' )
			->willReturn( $mediaInfo );
		$content->method( 'getTextForSearchIndex' )
			->willReturn( $textForSearchIndex );

		$field = $this->getMockBuilder( WikibaseIndexField::class )
			->disableOriginalConstructor()
			->getMock();
		$field->method( 'getFieldData' )
			->with( $mediaInfo )
			->willReturn( $fieldData );

		$fieldDefinitions = $this->getMockBuilder( FieldDefinitions::class )
			->disableOriginalConstructor()
			->getMock();
		$fieldDefinitions->method( 'getFields' )
			->willReturn( [ $fieldName => $field ] );

		$mediaInfoHandler = $this->newMediaInfoHandler();
		$reflection = new \ReflectionClass( $mediaInfoHandler );
		$fieldDefinitionsProperty = $reflection->getProperty( 'fieldDefinitions' );
		$fieldDefinitionsProperty->setAccessible( true );
		$fieldDefinitionsProperty->setValue( $mediaInfoHandler, $fieldDefinitions );

		$fieldsData = $mediaInfoHandler->getSlotDataForSearchIndex( $content );
		$this->assertEquals(
			$textForSearchIndex,
			$fieldsData[ MediaInfoHandler::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_TEXT ]
		);
		$this->assertEquals(
			$fieldData,
			$fieldsData[ $fieldName ]
		);
	}

	public function testGetTitleForId() {
		$testId = 999;
		$testTitle = Title::newFromID( $testId );

		$mediaInfoHandler = $this->newMediaInfoHandler();

		$mockId = $this->getMockBuilder( MediaInfoId::class )
			->disableOriginalConstructor()
			->getMock();
		$mockId->method( 'getNumericId' )
			->willReturn( $testId );

		$this->assertEquals( $testTitle, $mediaInfoHandler->getTitleForId( $mockId ) );
	}

}
