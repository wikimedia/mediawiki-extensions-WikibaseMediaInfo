<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\Property;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\View\FilePageEntityTermsView;
use Wikibase\MediaInfo\View\FilePageMediaInfoView;
use Wikibase\View\EntityTermsView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\StatementSectionsView;
use Wikibase\View\Template\TemplateFactory;

/**
 * @covers \Wikibase\MediaInfo\View\MediaInfoView
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class FilePageMediaInfoViewTest extends \PHPUnit\Framework\TestCase {

	private $values = [
		'entityType' => 'TEST_TYPE',
		'entityId' => 'P999'
	];
	/** @var  \Wikibase\View\Template\TemplateFactory */
	private $templateFactory;
	/** @var  EntityTermsView */
	private $entityTermsView;
	/** @var  StatementSectionsView */
	private $statementSectionsView;
	/** @var  LanguageDirectionalityLookup */
	private $languageDirectionalityLookup;
	/** @var  EntityDocument */
	private $entity;
	/** @var string  */
	private $languageCode = 'qqq';
	/** @var  FilePageMediaInfoView */
	private $sut;

	private function createMocks() {
		$this->templateFactory = $this->getMockBuilder( TemplateFactory::class )
			->disableOriginalConstructor()
			->getMock();
		$this->entityTermsView = $this->getMockBuilder( FilePageEntityTermsView::class )
			->disableOriginalConstructor()
			->getMock();
		$this->languageDirectionalityLookup = $this->getMockBuilder(
			LanguageDirectionalityLookup::class
			)->disableOriginalConstructor()
			->getMock();

		$this->entity = $this->getMockBuilder( MediaInfo::class )
			->disableOriginalConstructor()
			->getMock();
		$this->entity->method( 'getType' )
			->willReturn( $this->values['entityType'] );
		$this->entity->method( 'getID' )
			->willReturn( new PropertyId( $this->values['entityId'] ) );
		$this->entity->method( 'getLabels' )
			->willReturn( new TermList( [] ) );
		$this->entity->method( 'getDescriptions' )
			->willReturn( new TermList( [] ) );

		$this->sut = new FilePageMediaInfoView(
			$this->templateFactory,
			$this->entityTermsView,
			$this->languageDirectionalityLookup,
			$this->languageCode,
			null
		);
	}

	public function testGetHtml() {
		$this->createMocks();

		$langDir = 'TEST_DIR';
		$entityTermsViewHtml = 'TEST_HTML';
		$renderedContent = 'TEST_RENDERED';

		$this->languageDirectionalityLookup
			->method( 'getDirectionality' )
			->willReturn( $langDir );
		$this->entityTermsView
			->method( 'getHtml' )
			->willReturn( $entityTermsViewHtml );

		$this->templateFactory
			->expects( $this->once() )
			->method( 'render' )
			->with(
				'filepage-entityview',
				$this->values['entityType'],
				$this->values['entityId'],
				$langDir,
				$entityTermsViewHtml
			)->willReturn( $renderedContent );

		$this->assertEquals( $renderedContent, $this->sut->getHtml( $this->entity ) );
	}

	public function testGetHtmlException() {
		$this->createMocks();
		try {
			$this->sut->getHtml( new Property( new PropertyId( 'P999' ) ) );
			$this->assertFalse(
				true,
				'Expected exception not thrown when invalid type passed'
			);
		} catch ( \Exception $e ) {
			$this->assertTrue( true );
		}
	}

}
