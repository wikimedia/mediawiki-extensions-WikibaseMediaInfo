<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Content;

use Closure;
use HistoryAction;
use PHPUnit_Framework_TestCase;
use ViewAction;
use Wikibase\DataModel\Entity\EntityIdParser;
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
		return new MediaInfoHandler(
			$this->getMock( EntityPerPage::class ),
			$this->getMock( TermIndex::class ),
			$this->getMockWithoutConstructor( EntityContentDataCodec::class ),
			$this->getMockWithoutConstructor( EntityConstraintProvider::class ),
			$this->getMock( ValidatorErrorLocalizer::class ),
			$this->getMock( EntityIdParser::class ),
			$this->getMock( EntityIdLookup::class ),
			$this->getMockBuilder( LanguageFallbackLabelDescriptionLookupFactory::class )
				->disableOriginalConstructor()
				->getMock()
		);
	}

	public function testGetActionOverrides() {
		$mediaInfoHandler = $this->newMediaInfoHandler();

		$actionOverrides = $mediaInfoHandler->getActionOverrides();

		$this->assertSame(
			[ 'history', 'view', 'edit', 'submit' ],
			array_keys( $actionOverrides )
		);

		$this->assertTrue( $actionOverrides['history'] instanceof Closure );
		$this->assertTrue( is_subclass_of( $actionOverrides['view'], ViewAction::class ) );
		$this->assertTrue( is_subclass_of( $actionOverrides['edit'], ViewAction::class ) );
		$this->assertTrue( is_subclass_of( $actionOverrides['submit'], ViewAction::class ) );
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

		$this->assertEquals( MediaInfo::ENTITY_TYPE, $mediaInfoHandler->getEntityType() );
	}

}
