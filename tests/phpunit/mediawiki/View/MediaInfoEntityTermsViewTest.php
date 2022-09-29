<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use Language;
use MediaWikiTestCaseTrait;
use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\Lib\ContentLanguages;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\Lib\LanguageWithConversion;
use Wikibase\Lib\TermLanguageFallbackChain;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;

/**
 * @covers \Wikibase\MediaInfo\View\MediaInfoEntityTermsView
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityTermsViewTest extends \PHPUnit\Framework\TestCase {
	use MediaWikiTestCaseTrait;

	/** @var LanguageNameLookup */
	private $langNameLookup;
	/** @var LanguageDirectionalityLookup */
	private $langDirLookup;
	/** @var LocalizedTextProvider */
	private $textProvider;
	/** @var TermLanguageFallbackChain */
	private $fallbackChain;

	private function createDependencies( $fallbackLangCodes ) {
		$this->langNameLookup = $this->createMock( LanguageNameLookup::class );
		$this->langNameLookup
			->method( 'getName' )
			->willReturn( 'TEST_LANGUAGE_NAME' );
		$this->langDirLookup = $this->createMock( LanguageDirectionalityLookup::class );
		$language = !empty( $fallbackLangCodes[0] )
			? Language::factory( $fallbackLangCodes[0] )
			: Language::factory( 'en' );
		$this->textProvider = new MediaWikiLocalizedTextProvider( $language );
		$languages = [];
		foreach ( $fallbackLangCodes as $langCode ) {
			$languages[] = LanguageWithConversion::factory( $langCode );
		}
		$stubContentLanguages = $this->createStub( ContentLanguages::class );
		$stubContentLanguages->method( 'hasLanguage' )
			->willReturn( true );
		$this->fallbackChain = new TermLanguageFallbackChain( $languages, $stubContentLanguages );
	}

	private function createTestEntityWithLabels( $labelsArray ) {
		$labels = new TermList();
		foreach ( $labelsArray as $langCode => $value ) {
			$labels->setTerm( new Term( $langCode, $value ) );
		}
		return new MediaInfo( null, $labels );
	}

	/**
	 * @param string[] $labels Array with langCodes as keys, label text for that language as values
	 * @param string[] $fallbackLangCodes Array of lang codes
	 * @dataProvider provideLabelsAndFallback
	 */
	public function testGetHtml( $labels, $fallbackLangCodes ) {
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
		// - at least one caption without display:none
		// - two captions without display:none if the first caption
		//	 in the fallback chain has no value, and some other captions has a value
		$shownLabelCount = 1;
		if (
			!$testEntity->getLabels()->hasTermForLanguage( $fallbackLangCodes[0] ) &&
			count( $labels ) > 0
		) {
			$shownLabelCount = 2;
		}
		// Labels with HIDEABLE_LABEL_CLASS in the output should be hidden by default - so the string
		// "display: none" should appear ((the number of languages) - $showLabelClassCount) times
		$displayNoneCount = count( $expectedLanguageOrder ) - $shownLabelCount;

		$sut = new MediaInfoEntityTermsView(
			$this->langNameLookup,
			$this->langDirLookup,
			$this->textProvider,
			$this->fallbackChain
		);
		$html = $sut->getHtml( $testEntity );

		// Check language codes found in the right order
		$this->assertMatchesRegularExpression(
			$labelOrderRegex,
			$html,
			'Language codes not found in order in output'
		);

		// Expect to find the right number of HIDEABLE_LABEL_CLASS strings
		$this->assertEquals(
			substr_count( $html, MediaInfoEntityTermsView::HIDEABLE_CAPTION_CLASS ),
			$displayNoneCount
		);

		// Expect to find the right number of "display:none" strings
		preg_match_all( '/display:\s*none/is', $html, $matches );
		if (
			!isset( $matches[0] ) ||
			count( $matches[0] ) < $displayNoneCount
		) {
			$this->fail(
				'Incorrect number of "display:none" strings found'
			);
		}
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
		$testLangName = strtoupper( $languageCode . '_NAME' );
		$testLangDir = 'TEST_LANG_DIR>';

		$langNameLookup = $this->createMock( LanguageNameLookup::class );
		$langNameLookup
			->expects( $this->atLeastOnce() )
			->method( 'getName' )
			->with( $languageCode )
			->willReturn( $testLangName );
		$langDirLookup = $this->createMock( LanguageDirectionalityLookup::class );
		$langDirLookup
			->expects( $this->atLeastOnce() )
			->method( 'getDirectionality' )
			->with( $languageCode )
			->willReturn( $testLangDir );

		$sut = new MediaInfoEntityTermsView(
			$langNameLookup,
			$langDirLookup,
			$this->textProvider,
			$this->fallbackChain
		);
		$html = $sut->getSingleCaptionLayout( $labels, $languageCode, $showLabel )->toString();

		if ( $labels->hasTermForLanguage( $languageCode ) ) {
			$this->assertMatchesRegularExpression(
				'/lang=("|\')' . htmlspecialchars( $languageCode ) . '\\1/',
				$html,
				'Expected language attribute not found'
			);
			$this->assertMatchesRegularExpression(
				'/' . htmlspecialchars( $testLangName ) . '/',
				$html,
				'Expected language name not found'
			);
			$this->assertMatchesRegularExpression(
				'/dir=("|\')' . htmlspecialchars( $testLangDir ) . '\\1/',
				$html,
				'Expected dir attribute not found'
			);
			$this->assertDoesNotMatchRegularExpression(
				'/' . MediaInfoEntityTermsView::CAPTION_EMPTY_CLASS . '/',
				$html,
				'Show label class found unexpectedly in output'
			);
		} else {
			$this->assertMatchesRegularExpression(
				'/' . MediaInfoEntityTermsView::CAPTION_EMPTY_CLASS . '/',
				$html,
				'Show label class found unexpectedly in output'
			);
		}

		if ( $showLabel ) {
			$this->assertDoesNotMatchRegularExpression(
				'/' . MediaInfoEntityTermsView::HIDEABLE_CAPTION_CLASS . '/',
				$html,
				'hideable label class found unexpectedly in output'
			);
			$this->assertDoesNotMatchRegularExpression(
				'/display:\s*none/i',
				$html,
				'Expected "display:none" found unexpectedly in output'
			);
		} else {
			$this->assertMatchesRegularExpression(
				'/' . MediaInfoEntityTermsView::HIDEABLE_CAPTION_CLASS . '/',
				$html,
				'hideable label class not found in output'
			);
			$this->assertMatchesRegularExpression(
				'/display:\s*none/i',
				$html,
				'Expected "display:none" not found in output'
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
