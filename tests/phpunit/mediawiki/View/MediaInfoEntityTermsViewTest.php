<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\LanguageFallbackChain;
use Wikibase\LanguageWithConversion;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;
use Wikibase\View\Template\TemplateFactory;
use Wikibase\View\Template\TemplateRegistry;

/**
 * @covers \Wikibase\MediaInfo\View\FilePageEntityTermsView
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityTermsViewTest extends \PHPUnit\Framework\TestCase {

	/** @var  LanguageNameLookup */
	private $langNameLookup;
	/** @var  LanguageDirectionalityLookup */
	private $langDirLookup;
	/** @var  LocalizedTextProvider */
	private $textProvider;
	/** @var  LanguageFallbackChain */
	private $fallbackChain;

	private function createDependencies( $fallbackLangCodes ) {
		$this->langNameLookup = $this->getMockBuilder( LanguageNameLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$this->langDirLookup = $this->getMockBuilder( LanguageDirectionalityLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$this->textProvider = $this->getMockBuilder( LocalizedTextProvider::class )
			->disableOriginalConstructor()
			->getMock();
		$languages = [];
		foreach ( $fallbackLangCodes as $langCode ) {
			$languages[] = LanguageWithConversion::factory( $langCode );
		}
		$this->fallbackChain = new LanguageFallbackChain( $languages );
	}

	private function createTestEntityWithLabels( $labelsArray ) {
		$labels = new TermList();
		foreach ( $labelsArray as $langCode => $value ) {
			$labels->setTerm( new Term( $langCode, $value ) );
		}
		return new MediaInfo( null, $labels );
	}

	public function testGetHtml_noLabels() {
		$this->createDependencies( [] );

		$entityTermsViewHtml = 'TEST_HTML';
		$templateFactory = $this->getMockBuilder( TemplateFactory::class )
			->disableOriginalConstructor()
			->getMock();
		$templateFactory
			->method( 'render' )
			->will(
				$this->returnCallback( function ( ...$args ) use ( $entityTermsViewHtml ) {
					if ( $args[0] == 'filepage-entitytermsview' ) {
						return $entityTermsViewHtml;
					}
					return 'UNEXPECTED_HTML';
				} )
			);

		$sut = new MediaInfoEntityTermsView(
			$templateFactory,
			$this->langNameLookup,
			$this->langDirLookup,
			$this->textProvider,
			$this->fallbackChain
		);

		$this->assertEquals(
			$entityTermsViewHtml,
			$sut->getHtml(
				$this->createTestEntityWithLabels( [] )
			)
		);
	}

	/**
	 * @param [] $labels Array with langCodes as keys, label text for that language as values
	 * @param [] $fallbackLangCodes Array of lang codes
	 * @dataProvider provideLabelsAndFallback
	 */
	public function testGetHtml_withLabels( $labels, $fallbackLangCodes ) {
		$this->createDependencies( $fallbackLangCodes );
		$testEntity = $this->createTestEntityWithLabels( $labels );

		// Expected display order of label languages is:
		// First language in the fallback chain, whether or not it has a value
		// Other languages from fallback chain that have values, in order
		// Any other languages for which there are values
		$expectedLanguageOrder = [];
		foreach ( $fallbackLangCodes as $index => $fbLangCode ) {
			if ( $index == 0 || $testEntity->getLabels()->hasTermForLanguage( $fbLangCode ) ) {
				$expectedLanguageOrder[] = $fbLangCode;
			}
		}
		foreach ( $labels as $langCode => $value ) {
			if ( !in_array( $langCode, $expectedLanguageOrder ) ) {
				$expectedLanguageOrder[] = $langCode;
			}
		}
		$labelOrderRegex = '/' . implode( '.+', $expectedLanguageOrder ) . '/s';

		// Expect to find in the output
		// - at least one SHOW_LABEL_CLASS
		// - two SHOW_LABEL_CLASSes if the first label in the fallback chain has no value, and
		//   some other label has a value
		$showLabelClassCount = 1;
		if (
			!$testEntity->getLabels()->hasTermForLanguage( $fallbackLangCodes[0] ) &&
			count( $labels ) > 0
		) {
			$showLabelClassCount = 2;
		}
		// Labels without SHOW_LABEL_CLASS in the output should be hidden by default - so the string
		// "display: none" should appear ((the number of languages) - $showLabelClassCount) times
		$displayNoneCount = count( $expectedLanguageOrder ) - $showLabelClassCount;

		$realTemplateFactory = new TemplateFactory(
			new TemplateRegistry( include __DIR__ . '/../../../../resources/templates.php' )
		);
		$callback = function ( ...$args )
			use (
				$labelOrderRegex,
				$showLabelClassCount,
				$displayNoneCount,
				$realTemplateFactory
			) {
				if ( $args[0] == 'filepage-entitytermsview' ) {
					// Expect to find the lang codes in the rendered html in order
					if ( preg_match( $labelOrderRegex, $args[1] ) == false ) {
						$this->fail(
							'Language codes not found in order in output'
						);
					}
					// Expect to find the right number of SHOW_LABEL_CLASS strings
					if (
						substr_count(
							$args[1],
							MediaInfoEntityTermsView::SHOW_LABEL_CLASS
						) != $showLabelClassCount
					) {
						$this->fail(
							'Incorrect number of show label class strings found'
						);
					}
					// Expect to find the right number of "display:none" strings
					preg_match_all( '/display:\s*none/is', $args[1], $matches );
					if (
						!isset( $matches[0] ) ||
						count( $matches[0] ) < $displayNoneCount
					) {
						$this->fail(
							'Incorrect number of "display:none" strings found'
						);
					}
				}

				return call_user_func_array(
					[ $realTemplateFactory, 'render' ],
					$args
				);
		};
		$templateFactory = $this->getMockTemplateFactory( $callback );

		$sut = new MediaInfoEntityTermsView(
			$templateFactory,
			$this->langNameLookup,
			$this->langDirLookup,
			$this->textProvider,
			$this->fallbackChain
		);
		$this->assertNotEmpty(
			$sut->getHtml(
				$testEntity
			)
		);
	}

	private function getMockTemplateFactory( callable $callback ) {
		$mockTemplateFactory = $this->getMockBuilder( TemplateFactory::class )
			->disableOriginalConstructor()
			->getMock();
		$mockTemplateFactory
			->method( 'render' )
			->will(
				$this->returnCallback( $callback )
			);
		return $mockTemplateFactory;
	}

	public function provideLabelsAndFallback() {
		return [
			[
				'labels' => [
					'en' => 'EN_TEST_LABEL',
					'fr' => 'FR_TEST_LABEL',
					'ga' => 'GA_TEST_LABEL',
				],
				'fallback' => [ 'ga', 'en', 'fr' ]
			],
			[
				'labels' => [
					'en' => 'TEST_LABEL',
				],
				'fallback' => [ 'ga', 'en', 'fr' ]
			],
			[
				'labels' => [
					'en' => 'EN_TEST_LABEL',
					'fr' => 'FR_TEST_LABEL',
					'ar' => 'AR_TEST_LABEL',
				],
				'fallback' => [ 'ga', 'en', ]
			],
			[
				'labels' => [],
				'fallback' => [ 'ga' ]
			],
		];
	}

	/**
	 * @param TermList $labels
	 * @param string $languageCode
	 * @param bool $showLabel
	 * @dataProvider provideForGetSingleLabelHtml
	 */
	public function testGetSingleLabelHtml( TermList $labels, $languageCode, $showLabel ) {
		$this->createDependencies( [] );
		$testLangName = 'TEST_LANG_NAME<';
		$testLangDir = 'TEST_LANG_DIR>';

		$this->langNameLookup
			->expects( $this->atLeastOnce() )
			->method( 'getName' )
			->with( $languageCode )
			->willReturn( $testLangName );
		$this->langDirLookup
			->expects( $this->atLeastOnce() )
			->method( 'getDirectionality' )
			->with( $languageCode )
			->willReturn( $testLangDir );

		$realTemplateFactory = new TemplateFactory(
			new TemplateRegistry( include __DIR__ . '/../../../../resources/templates.php' )
		);
		$callback = function ( ...$args )
		use (
			$languageCode,
			$testLangName,
			$testLangDir,
			$realTemplateFactory
		) {
			if ( $args[0] == 'filepage-entitytermslanguageelement' ) {
				$this->assertEquals( htmlspecialchars( $testLangName ), $args[1] );
				$this->assertEquals( htmlspecialchars( $testLangDir ), $args[2] );
				$this->assertEquals( htmlspecialchars( $languageCode ), $args[3] );
			}

			return call_user_func_array(
				[ $realTemplateFactory, 'render' ],
				$args
			);
		};
		$templateFactory = $this->getMockTemplateFactory( $callback );

		$sut = new MediaInfoEntityTermsView(
			$templateFactory,
			$this->langNameLookup,
			$this->langDirLookup,
			$this->textProvider,
			$this->fallbackChain
		);
		$html = $sut->getSingleLabelHtml( $labels, $languageCode, $showLabel );

		if ( $labels->hasTermForLanguage( $languageCode ) ) {
			$this->assertNotRegExp(
				'/' . MediaInfoEntityTermsView::LABEL_EMPTY_CLASS . '/',
				$html,
				'Show label class found unexpectedly in output'
			);
		} else {
			$this->assertRegExp(
				'/' . MediaInfoEntityTermsView::LABEL_EMPTY_CLASS . '/',
				$html,
				'Show label class found unexpectedly in output'
			);
		}

		if ( $showLabel ) {
			$this->assertRegExp(
				'/' . MediaInfoEntityTermsView::SHOW_LABEL_CLASS . '/',
				$html,
				'Show label class not found in output'
			);
		} else {
			$this->assertNotRegExp(
				'/' . MediaInfoEntityTermsView::SHOW_LABEL_CLASS . '/',
				$html,
				'Show label class found unexpectedly in output'
			);
			$this->assertRegExp(
				'/display:\s*none/i',
				$html,
				'"display:none" not found in output'
			);
		}
	}

	public function provideForGetSingleLabelHtml() {
		$termList = $this->createTestEntityWithLabels( [
			'en' => 'EN_TEST_LABEL',
			'fr' => 'FR_TEST_LABEL',
			'ar' => 'AR_TEST_LABEL',
		] )->getLabels();

		return [
			'show label' => [
				'termList' => $termList,
				'languageCode' => 'en',
				'showLabel' => true,
			],
			'do not show label' => [
				'termList' => $termList,
				'languageCode' => 'en',
				'showLabel' => false,
			],
			'empty label, show' => [
				'termList' => $termList,
				'languageCode' => 'ga',
				'showLabel' => true,
			],
			'empty label, do not show' => [
				'termList' => $termList,
				'languageCode' => 'ga',
				'showLabel' => false,
			],
		];
	}

}
