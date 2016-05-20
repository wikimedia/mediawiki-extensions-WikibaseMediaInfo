<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use Action;
use Closure;
use IContextSource;
use Language;
use Page;
use PHPUnit_Framework_TestCase;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\LanguageFallbackLabelDescriptionLookupFactory;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
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
		$labelLookupFactory = $this->getMockWithoutConstructor(
			LanguageFallbackLabelDescriptionLookupFactory::class
		);
		$labelLookupFactory->expects( $this->any() )
			->method( 'newLabelDescriptionLookup' )
			->will( $this->returnValue( $this->getMock( LabelDescriptionLookup::class ) ) );

		return new MediaInfoHandler(
			$this->getMock( EntityPerPage::class ),
			$this->getMock( TermIndex::class ),
			$this->getMockWithoutConstructor( EntityContentDataCodec::class ),
			$this->getMockWithoutConstructor( EntityConstraintProvider::class ),
			$this->getMock( ValidatorErrorLocalizer::class ),
			$this->getMock( EntityIdParser::class ),
			$this->getMock( EntityIdLookup::class ),
			$labelLookupFactory
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

}
