<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use Action;
use Closure;
use FauxRequest;
use IContextSource;
use Language;
use Page;
use PHPUnit_Framework_TestCase;
use RequestContext;
use Title;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\LanguageFallbackLabelDescriptionLookupFactory;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\Content\MissingMediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\Repo\Store\EntityPerPage;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Store\EntityIdLookup;
use Wikibase\TermIndex;

/**
 * @covers Wikibase\MediaInfo\Content\MediaInfoHandler
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoHandlerTest extends PHPUnit_Framework_TestCase {

	private function getMockWithoutConstructor( $className ) {
		return $this->getMockBuilder( $className )
			->disableOriginalConstructor()
			->getMock();
	}

	private function newMediaInfoHandler() {
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

		return new MediaInfoHandler(
			$this->getMock( EntityPerPage::class ),
			$this->getMock( TermIndex::class ),
			$this->getMockWithoutConstructor( EntityContentDataCodec::class ),
			$this->getMockWithoutConstructor( EntityConstraintProvider::class ),
			$this->getMock( ValidatorErrorLocalizer::class ),
			$this->getMock( EntityIdParser::class ),
			$this->getMock( EntityIdLookup::class ),
			$labelLookupFactory,
			$missingMediaInfoHandler,
			$filePageLookup
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

			$action = $override( $this->getMock( Page::class ), $context );
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

}
