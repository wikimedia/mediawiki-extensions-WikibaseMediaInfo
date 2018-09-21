<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;
use Wikibase\View\Template\TemplateFactory;

/**
 * @covers \Wikibase\MediaInfo\View\FilePageEntityTermsView
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityTermsViewTest extends \PHPUnit\Framework\TestCase {

	/** @var  TemplateFactory */
	private $templateFactory;
	/** @var  LanguageNameLookup */
	private $langNameLookup;
	/** @var  LanguageDirectionalityLookup */
	private $langDirLookup;
	/** @var  LocalizedTextProvider */
	private $textProvider;

	private function createMocksForConstructor() {
		$this->templateFactory = $this->getMockBuilder( TemplateFactory::class )
			->disableOriginalConstructor()
			->getMock();
		$this->langNameLookup = $this->getMockBuilder( LanguageNameLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$this->langDirLookup = $this->getMockBuilder( LanguageDirectionalityLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$this->textProvider = $this->getMockBuilder( LocalizedTextProvider::class )
			->disableOriginalConstructor()
			->getMock();
	}

	public function testGetHtml() {
		$this->createMocksForConstructor();

		//Set up expectations
		$templateFactoryReturnValue = 'TEST_HTML';
		$this->templateFactory
			->expects( $this->atLeastOnce() )
			->method( 'render' )
			->willReturn( $templateFactoryReturnValue );

		$labelText = 'LABEL_TEXT';
		$testLabel = $this->getMockBuilder( Term::class )
			->disableOriginalConstructor()
			->getMock();
		$testLabel->expects( $this->any() )
			->method( 'getText' )
			->willReturn( $labelText );

		$mainLanguageCode = 'qqq';
		$testLabels = $this->getMockBuilder( TermList::class )
			->disableOriginalConstructor()
			->getMock();
		$testLabels->expects( $this->any() )
			->method( 'getByLanguage' )
			->willReturn( $testLabel );
		$testLabels->method( 'toTextArray' )
			->willReturn( [ $labelText ] );
		$testLabels->method( 'hasTermForLanguage' )
			->willReturn( true );

		$testEntity = $this->getMockBuilder( MediaInfo::class )
			->disableOriginalConstructor()
			->getMock();
		$testEntity->expects( $this->atLeastOnce() )
			->method( 'getLabels' )
			->willReturn( $testLabels );

		$sut = new MediaInfoEntityTermsView(
			$this->templateFactory,
			$this->langNameLookup,
			$this->langDirLookup,
			$this->textProvider,
			[ 'en' ]
		);
		$this->assertEquals(
			$templateFactoryReturnValue,
			$sut->getHtml(
				$testEntity,
				$mainLanguageCode
			)
		);
	}

}
