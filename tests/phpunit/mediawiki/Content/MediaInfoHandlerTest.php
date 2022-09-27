<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use IContextSource;
use RequestContext;
use Title;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\ItemIdParser;
use Wikibase\DataModel\Services\Lookup\PropertyDataTypeLookup;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Search\Elastic\Fields\StatementProviderFieldDefinitions;

/**
 * @covers \Wikibase\MediaInfo\Content\MediaInfoHandler
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoHandlerTest extends \MediaWikiIntegrationTestCase {

	private function newMediaInfoHandler( array $replacements = [] ) {
		$m17 = new MediaInfoId( 'M17' );

		$propertyLookup = $this->createMock( PropertyDataTypeLookup::class );
		$propertyLookup->method( 'getDataTypeIdForProperty' )
			->willReturn( 'string' );

		$missingMediaInfoHandler = $this->createMock( MissingMediaInfoHandler::class );
		$missingMediaInfoHandler->method( 'getMediaInfoId' )
			->willReturn( $m17 );
		$missingMediaInfoHandler->method( 'showVirtualMediaInfo' )
			->willReturnCallback( static function ( MediaInfoId $id, IContextSource $context ) {
				$context->getOutput()->addHTML( 'MISSING!' );
			} );

		$idLookup = $this->createMock( MediaInfoIdLookup::class );
		$idLookup->method( 'getEntityIdForTitle' )
			->willReturnCallback( static function ( Title $title ) {
				if ( $title->getPrefixedDBkey() !== 'Test-M1.png' ) {
					return null;
				}

				return new MediaInfoId( 'M1' );
			} );

		$filePageLookup = $this->createMock( FilePageLookup::class );
		$filePageLookup->method( 'getFilePage' )
			->willReturnCallback( static function ( MediaInfoId $id ) {
				if ( $id->getSerialization() !== 'M1' ) {
					return null;
				}

				return Title::makeTitle( NS_FILE, 'Test-' . $id->getSerialization() . '.png' );
			} );

		return new MediaInfoHandler(
			$this->createMock( EntityContentDataCodec::class ),
			$this->createMock( EntityConstraintProvider::class ),
			$this->createMock( ValidatorErrorLocalizer::class ),
			new ItemIdParser(),
			$missingMediaInfoHandler,
			!empty( $replacements[ 'idLookup' ] )
				? $replacements[ 'idLookup' ] : $idLookup,
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
			$this->getServiceContainer()->getPageStore(),
			$this->getServiceContainer()->getTitleFactory(),
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
		$context = new RequestContext();
		$context->setTitle( $title );

		$mediaInfoHandler->showMissingEntity( $title, $context );

		$html = $context->getOutput()->getHTML();
		$this->assertStringContainsString( 'MISSING!', $html );
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

	public function testGetTitleForId() {
		$testId = 999;
		$testTitle = Title::newFromID( $testId );

		$mediaInfoHandler = $this->newMediaInfoHandler();

		$mockId = $this->createMock( MediaInfoId::class );
		$mockId->method( 'getNumericId' )
			->willReturn( $testId );

		$this->assertEquals( $testTitle, $mediaInfoHandler->getTitleForId( $mockId ) );
	}

}
