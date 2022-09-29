<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use Html;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\NumericPropertyId;
use Wikibase\DataModel\Entity\Property;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\View\MediaInfoEntityStatementsView;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\View\EntityTermsView;

/**
 * @covers \Wikibase\MediaInfo\View\MediaInfoView
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoViewTest extends \PHPUnit\Framework\TestCase {

	/** @var string[] */
	private $values = [
		'entityType' => 'TEST_TYPE',
		'entityId' => 'P999'
	];
	/** @var EntityTermsView */
	private $entityTermsView;
	/** @var MediaInfoEntityStatementsView */
	private $statementsView;
	/** @var EntityDocument */
	private $entity;
	/** @var string */
	private $languageCode = 'qqq';
	/** @var MediaInfoView */
	private $sut;

	private function createMocks() {
		$this->entityTermsView = $this->createMock( MediaInfoEntityTermsView::class );
		$this->statementsView = $this->createMock( MediaInfoEntityStatementsView::class );

		$this->entity = $this->createMock( MediaInfo::class );
		$this->entity->method( 'getType' )
			->willReturn( $this->values['entityType'] );
		$this->entity->method( 'getID' )
			->willReturn( new NumericPropertyId( $this->values['entityId'] ) );
		$this->entity->method( 'getLabels' )
			->willReturn( new TermList( [] ) );
		$this->entity->method( 'getDescriptions' )
			->willReturn( new TermList( [] ) );

		$this->sut = new MediaInfoView(
			$this->entityTermsView,
			$this->languageCode,
			$this->statementsView
		);
	}

	public function testGetContent() {
		$this->createMocks();

		$termsViewHtml = 'TEST_TERMS_HTML';
		$statementsViewHtml = 'TEST_STATEMENTS_HTML';

		$this->entityTermsView
			->method( 'getHtml' )
			->willReturn( $termsViewHtml );
		$this->statementsView
			->method( 'getHtml' )
			->willReturn( $statementsViewHtml );

		$html = $termsViewHtml . $statementsViewHtml;

		$expectedContent = Html::rawElement(
			MediaInfoView::MEDIAINFOVIEW_CUSTOM_TAG,
			[ 'style' => 'display: none' ],
			$html
		);

		$viewContent = $this->sut->getContent( $this->entity );

		$this->assertEquals( $expectedContent, $viewContent->getHtml() );
		$this->assertSame( [], $viewContent->getPlaceholders() );
	}

	public function testGetContentException() {
		$this->createMocks();
		try {
			$this->sut->getContent( new Property( new NumericPropertyId( 'P999' ), null, 'string' ) );
			$this->fail( 'Expected exception not thrown when invalid type passed' );
		} catch ( \Exception $e ) {
			$this->assertTrue( true );
		}
	}

}
