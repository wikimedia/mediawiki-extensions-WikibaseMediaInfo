<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use InvalidArgumentException;
use PHPUnit_Framework_TestCase;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\View\EntityTermsView;
use Wikibase\View\EntityView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\StatementSectionsView;
use Wikibase\View\Template\TemplateFactory;

/**
 * @covers Wikibase\MediaInfo\View\MediaInfoView
 *
 * @license GPL-2.0+
 * @author Adrian Heine < adrian.heine@wikimedia.de >
 */
class MediaInfoViewTest extends PHPUnit_Framework_TestCase {

	/**
	 * @return StatementSectionsView
	 */
	private function newStatementSectionsViewMock() {
		return $this->getMockBuilder( StatementSectionsView::class )
			->disableOriginalConstructor()
			->getMock();
	}

	/**
	 * @return EntityTermsView
	 */
	private function newEntityTermsViewMock() {
		return $this->getMockBuilder( EntityTermsView::class )
			->disableOriginalConstructor()
			->getMock();
	}

	/**
	 * @return LanguageDirectionalityLookup
	 */
	private function newLanguageDirectionalityLookupMock() {
		$languageDirectionalityLookup = $this->getMock( LanguageDirectionalityLookup::class );
		$languageDirectionalityLookup->method( 'getDirectionality' )
			->willReturn( 'auto' );

		return $languageDirectionalityLookup;
	}

	private function newMediaInfoView(
		$contentLanguageCode = 'en',
		EntityTermsView $entityTermsView = null,
		StatementSectionsView $statementSectionsView = null
	) {
		$templateFactory = TemplateFactory::getDefaultInstance();

		if ( !$entityTermsView ) {
			$entityTermsView = $this->newEntityTermsViewMock();
		}

		if ( !$statementSectionsView ) {
			$statementSectionsView = $this->newStatementSectionsViewMock();
		}

		return new MediaInfoView(
			$templateFactory,
			$entityTermsView,
			$statementSectionsView,
			$this->newLanguageDirectionalityLookupMock(),
			$contentLanguageCode
		);
	}

	public function testInstantiate() {
		$view = $this->newMediaInfoView();
		$this->assertInstanceOf( MediaInfoView::class, $view );
		$this->assertInstanceOf( EntityView::class, $view );
	}

	public function testGetHtml_invalidEntityType() {
		$view = $this->newMediaInfoView();

		$entity = $this->getMock( EntityDocument::class );

		$this->setExpectedException( InvalidArgumentException::class );
		$view->getHtml( $entity );
	}

	/**
	 * @dataProvider provideTestGetHtml
	 */
	public function testGetHtml(
		MediaInfo $entity,
		MediaInfoId $entityId = null,
		$contentLanguageCode = 'en',
		StatementList $statements = null
	) {
		$entityTermsView = $this->newEntityTermsViewMock();
		$entityTermsView->expects( $this->once() )
			->method( 'getHtml' )
			->with(
				$contentLanguageCode,
				$entity,
				$entity,
				null,
				$entityId
			)
			->will( $this->returnValue( 'entityTermsView->getHtml' ) );

		$entityTermsView->expects( $this->never() )
			->method( 'getEntityTermsForLanguageListView' );

		$statementSectionsView = $this->newStatementSectionsViewMock();
		$statementSectionsView->expects( $this->once() )
			->method( 'getHtml' )
			->with(
				$this->callback( function( StatementList $statementList ) use ( $statements ) {
					return $statements ? $statementList === $statements : $statementList->isEmpty();
				} )
			)
			->will( $this->returnValue( 'statementSectionsView->getHtml' ) );

		$view = $this->newMediaInfoView(
			$contentLanguageCode,
			$entityTermsView,
			$statementSectionsView
		);

		$result = $view->getHtml( $entity );
		$this->assertInternalType( 'string', $result );
		$this->assertContains( 'wb-mediainfo', $result );
		$this->assertContains( 'entityTermsView->getHtml', $result );
	}

	public function provideTestGetHtml() {
		$mediaInfoId = new MediaInfoId( 'M1' );
		$statements = new StatementList( [
			new Statement( new PropertyNoValueSnak( new PropertyId( 'P1' ) ) )
		] );

		return [
			[
				new MediaInfo()
			],
			[
				new MediaInfo( $mediaInfoId ),
				$mediaInfoId
			],
			[
				new MediaInfo( $mediaInfoId, null, null, $statements ),
				$mediaInfoId,
				'en',
				$statements
			],
			[
				new MediaInfo( $mediaInfoId ),
				$mediaInfoId,
				'lkt'
			],
			[
				new MediaInfo( $mediaInfoId, null, null, $statements ),
				$mediaInfoId,
				'lkt',
				$statements
			],
		];
	}

	public function testGetTitleHtml_invalidEntityType() {
		$view = $this->newMediaInfoView();

		$entity = $this->getMock( EntityDocument::class );
		$html = $view->getTitleHtml( $entity );
		$this->assertSame( $html, '' );
	}

	/**
	 * @dataProvider provideTestGetTitleHtml
	 */
	public function testGetTitleHtml(
		MediaInfo $entity,
		MediaInfoId $entityId = null,
		$contentLanguageCode = 'en'
	) {
		$entityTermsView = $this->newEntityTermsViewMock();
		$entityTermsView->expects( $this->once() )
			->method( 'getTitleHtml' )
			->with( $entityId )
			->will( $this->returnValue( 'entityTermsView->getTitleHtml' ) );

		$view = $this->newMediaInfoView( $contentLanguageCode, $entityTermsView );

		$result = $view->getTitleHtml( $entity );
		$this->assertEquals( 'entityTermsView->getTitleHtml', $result );
	}

	public function provideTestGetTitleHtml() {
		$mediaInfoId = new MediaInfoId( 'M1' );
		$labels = new TermList( [ new Term( 'en', 'EN_LABEL' ) ] );

		return [
			[
				new MediaInfo()
			],
			[
				new MediaInfo(
					$mediaInfoId
				),
				$mediaInfoId
			],
			[
				new MediaInfo(
					$mediaInfoId,
					$labels
				),
				$mediaInfoId
			],
			[
				new MediaInfo(
					$mediaInfoId,
					$labels
				),
				$mediaInfoId,
				'lkt'
			],
		];
	}

}
