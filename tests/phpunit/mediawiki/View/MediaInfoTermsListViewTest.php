<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use Wikibase\Lib\LanguageNameLookup;
use Wikibase\MediaInfo\View\MediaInfoTermsListView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;
use Wikibase\View\Template\TemplateFactory;

/**
 * @covers \Wikibase\MediaInfo\View\MediaInfoTermsListView
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoTermsListViewTest extends \PHPUnit\Framework\TestCase {

	private $values = [
		'text' => [
			0 => 'TEXT_ZERO',
			1 => 'TEXT_ONE',
			2 => 'TEXT_TWO',
			3 => 'TEXT_THREE',
		],
		'input' => 'TEST_INPUT',
		'output' => 'TEST_OUTPUT',
	];
	/** @var  \Wikibase\View\Template\TemplateFactory */
	private $templateFactory;
	/** @var  LanguageNameLookup */
	private $languageNameLookup;
	/** @var  LocalizedTextProvider */
	private $textProvider;
	/** @var  LanguageDirectionalityLookup */
	private $languageDirectionalityLookup;
	/** @var  MediaInfoTermsListView */
	private $sut;

	private function createMocks() {
		$this->templateFactory = $this->getMockBuilder( TemplateFactory::class )
			->disableOriginalConstructor()
			->getMock();
		$this->languageNameLookup = $this->getMockBuilder( LanguageNameLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$this->textProvider = $this->getMockBuilder( LocalizedTextProvider::class )
			->disableOriginalConstructor()
			->getMock();
		$this->languageDirectionalityLookup = $this->getMockBuilder(
			LanguageDirectionalityLookup::class
			)->disableOriginalConstructor()
			->getMock();

		$this->sut = new MediaInfoTermsListView(
			$this->templateFactory,
			$this->languageNameLookup,
			$this->textProvider,
			$this->languageDirectionalityLookup
		);
	}

	public function testGetListViewHtml() {
		$this->createMocks();

		$this->textProvider
			->expects( $this->at( 0 ) )
			->method( 'get' )
			->with( 'wikibase-entitytermsforlanguagelistview-language' )
			->willReturn( $this->values['text'][0] );
		$this->textProvider
			->expects( $this->at( 1 ) )
			->method( 'get' )
			->with( 'wikibasemediainfo-entitytermsforlanguagelistview-caption' )
			->willReturn( $this->values['text'][1] );
		$this->textProvider
			->expects( $this->at( 2 ) )
			->method( 'get' )
			->with( 'wikibase-entitytermsforlanguagelistview-description' )
			->willReturn( $this->values['text'][2] );
		$this->textProvider
			->expects( $this->at( 3 ) )
			->method( 'get' )
			->with( 'wikibase-entitytermsforlanguagelistview-aliases' )
			->willReturn( $this->values['text'][3] );

		$this->templateFactory
			->expects( $this->once() )
			->method( 'render' )
			->with(
				'wikibase-entitytermsforlanguagelistview',
				$this->values['text'][0],
				$this->values['text'][1],
				$this->values['text'][2],
				$this->values['text'][3],
				$this->values['input']
			)->willReturn( $this->values['output'] );

		$this->assertEquals(
			$this->values['output'],
			$this->sut->getListViewHtml( $this->values['input'] )
		);
	}

}
