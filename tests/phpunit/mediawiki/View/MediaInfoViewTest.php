<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use InvalidArgumentException;
use Language;
use PHPUnit_Framework_TestCase;
use Title;
use User;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\Fingerprint;
use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\Lib\StaticContentLanguages;
use Wikibase\Lib\UserLanguageLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\View\EntityTermsView;
use Wikibase\View\EntityView;
use Wikibase\View\EntityViewPlaceholderExpander;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;
use Wikibase\View\StatementSectionsView;
use Wikibase\View\Template\TemplateFactory;
use Wikibase\View\TextInjector;

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
		TermList $descriptions = null,
		$contentLanguageCode = 'en',
		StatementList $statements = null
	) {
		$entityTermsView = $this->newEntityTermsViewMock();
		$entityTermsView->expects( $this->once() )
			->method( 'getHtml' )
			->with(
				$contentLanguageCode,
				$this->callback( function( Fingerprint $fingerprint ) use ( $descriptions ) {
					if ( $descriptions ) {
						return $fingerprint->getDescriptions() === $descriptions;
					} else {
						return $fingerprint->getDescriptions()->isEmpty();
					}
				} ),
				$entityId,
				$this->isType( 'string' ),
				$this->isInstanceOf( TextInjector::class )
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
		$descriptions = new TermList( [ new Term( 'en', 'EN_DESCRIPTION' ) ] );
		$statements = new StatementList( [
			new Statement( new PropertyNoValueSnak( new PropertyId( 'P1' ) ) )
		] );

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
					null,
					$descriptions,
					$statements
				),
				$mediaInfoId,
				$descriptions,
				'en',
				$statements
			],
			[
				new MediaInfo(
					$mediaInfoId,
					null,
					$descriptions
				),
				$mediaInfoId,
				$descriptions,
				'lkt'
			],
			[
				new MediaInfo(
					$mediaInfoId,
					null,
					$descriptions,
					$statements
				),
				$mediaInfoId,
				$descriptions,
				'lkt',
				$statements
			],
		];
	}

	/**
	 * @expectedException InvalidArgumentException
	 */
	public function testGetTitleHtml_invalidEntityType() {
		$view = $this->newMediaInfoView();

		$entity = $this->getMock( EntityDocument::class );
		$view->getTitleHtml( $entity );
	}

	/**
	 * @dataProvider provideTestGetTitleHtml
	 */
	public function testGetTitleHtml(
		MediaInfo $entity,
		TermList $labels = null,
		MediaInfoId $entityId = null,
		$contentLanguageCode = 'en'
	) {
		$entityTermsView = $this->newEntityTermsViewMock();
		$entityTermsView->expects( $this->once() )
			->method( 'getTitleHtml' )
			->with(
				$contentLanguageCode,
				$this->callback( function( Fingerprint $fingerprint ) use ( $labels ) {
					return $labels ? $fingerprint->getLabels() === $labels :
						$fingerprint->getLabels()->isEmpty();
				} ),
				$entityId
			)
			->will( $this->returnValue( 'entityTermsView->getTitleHtml' ) );

		$view = $this->newMediaInfoView( $contentLanguageCode, $entityTermsView );

		$result = $view->getTitleHtml( $entity );
		$this->assertInternalType( 'string', $result );
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
				null,
				$mediaInfoId
			],
			[
				new MediaInfo(
					$mediaInfoId,
					$labels
				),
				$labels,
				$mediaInfoId
			],
			[
				new MediaInfo(
					$mediaInfoId,
					$labels
				),
				$labels,
				$mediaInfoId,
				'lkt'
			],
		];
	}

	private function getEntityViewPlaceholderExpander( EntityDocument $entity, $uiLanguageCode ) {
		$userLanguageLookup = $this->getMock( UserLanguageLookup::class );
		$userLanguageLookup->expects( $this->once() )
			->method( 'getAllUserLanguages' )
			->will( $this->returnValue( [] ) );

		return new EntityViewPlaceholderExpander(
			TemplateFactory::getDefaultInstance(),
			$this->getMock( User::class ),
			Language::factory( $uiLanguageCode ),
			$entity,
			$entity,
			null,
			$userLanguageLookup,
			new StaticContentLanguages( [] ),
			$this->getMock( LanguageNameLookup::class ),
			$this->getMock( LocalizedTextProvider::class )
		);
	}

	public function testPlaceholderIntegration() {
		$entity = new MediaInfo( new MediaInfoId( 'M1' ) );

		$entityTermsView = $this->newEntityTermsViewMock();
		$entityTermsView->expects( $this->once() )
			->method( 'getHtml' )
			->will( $this->returnCallback(
				function(
					$languageCode,
					Fingerprint $fingerprint,
					MediaInfoId $entityId,
					$termBoxHtml,
					TextInjector $textInjector
				) {
					return $textInjector->newMarker(
						'entityViewPlaceholder-entitytermsview-entitytermsforlanguagelistview-class'
					) . $termBoxHtml;
				}
			) );

		$view = $this->newMediaInfoView( 'en', $entityTermsView );
		$html = $view->getHtml( $entity );
		$placeholders = $view->getPlaceholders();

		$this->assertEquals( 2, count( $placeholders ) );

		$injector = new TextInjector( $placeholders );
		$expander = $this->getEntityViewPlaceholderExpander( $entity, 'fa' );

		$html = $injector->inject( $html, [ $expander, 'getHtmlForPlaceholder' ] );

		$this->assertContains( 'wikibase-entitytermsforlanguageview-fa', $html );
	}

}
