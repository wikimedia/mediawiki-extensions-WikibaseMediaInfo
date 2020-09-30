<?php

namespace Wikibase\MediaInfo\View;

use Html;
use OOUI\Element;
use OOUI\HorizontalLayout;
use OOUI\LabelWidget;
use OOUI\PanelLayout;
use OOUI\Tag;
use OutputPage;
use Wikibase\DataModel\Term\TermList;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\Lib\TermLanguageFallbackChain;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;

/**
 * Generates HTML to display the terms of a MediaInfo entity
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityTermsView {

	/**
	 * @var LanguageNameLookup
	 */
	private $languageNameLookup;

	/**
	 * @var LanguageDirectionalityLookup
	 */
	private $languageDirectionalityLookup;

	/**
	 * @var LocalizedTextProvider
	 */
	private $textProvider;

	/**
	 * @var TermLanguageFallbackChain
	 */
	private $termFallbackChain;

	public const CAPTIONS_CUSTOM_TAG = 'mediaInfoViewCaptions';
	public const CAPTION_EMPTY_CLASS = 'wbmi-entityview-emptyCaption';
	public const HIDEABLE_CAPTION_CLASS = 'wbmi-entityview-hideable';
	private const CAPTIONS_CONTAINER = 'wbmi-entityview-captionsPanel';

	/**
	 * @param LanguageNameLookup $languageNameLookup
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param LocalizedTextProvider $textProvider
	 * @param TermLanguageFallbackChain $termFallbackChain
	 * @codeCoverageIgnore
	 */
	public function __construct(
		LanguageNameLookup $languageNameLookup,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		LocalizedTextProvider $textProvider,
		TermLanguageFallbackChain $termFallbackChain
	) {
		OutputPage::setupOOUI();

		$this->languageNameLookup = $languageNameLookup;
		$this->languageDirectionalityLookup = $languageDirectionalityLookup;
		$this->textProvider = $textProvider;
		$this->termFallbackChain = $termFallbackChain;
	}

	/**
	 * @param MediaInfo $entity
	 *
	 * @return string HTML
	 */
	public function getHtml(
		MediaInfo $entity
	) {
		$layout = new PanelLayout( [
			'classes' => [ self::CAPTIONS_CONTAINER ],
			'scrollable' => false,
			'padded' => false,
			'expanded' => false,
			'framed' => true,
		] );
		$layout->appendContent( $this->getCaptionsHeader() );
		$layout->appendContent(
			$this->getCaptionsContent(
				$entity->getLabels(),
				$this->getLanguagesOrderedByFallbackChain( $entity )
			)
		);
		$html = $layout->toString();

		// Wrap the whole thing in a custom tag so we can manipulate its position on the page
		// later on
		return Html::rawElement(
			self::CAPTIONS_CUSTOM_TAG,
			[],
			$html
		);
	}

	private function getCaptionsHeader() {
		$header = new Tag( 'h3' );
		$header->addClasses( [ 'wbmi-entityview-captions-header' ] );
		$header->appendContent(
			$this->textProvider->get(
				'wikibasemediainfo-entitytermsforlanguagelistview-caption'
			)
		);
		return $header;
	}

	/**
	 * Return the language codes for labels, in the following order:
	 *
	 * - the first language in the fallback chain (i.e. the interface language), whether or not
	 * 	 a label exists in that language
	 * - the rest of the languages in the fallback chain for which a label exists, in order
	 * - all other languages for which a label exists (in any order)
	 *
	 * @param MediaInfo $entity
	 * @return array
	 */
	private function getLanguagesOrderedByFallbackChain( MediaInfo $entity ) {
		$labelLanguages = array_keys( $entity->getLabels()->toTextArray() );
		$fbChainLanguages = $this->termFallbackChain->getFetchLanguageCodes();
		$orderedLangCodes =
			array_values(
				array_flip(
					array_merge(
						array_flip(
							array_intersect(
								$this->termFallbackChain->getFetchLanguageCodes(),
								$labelLanguages
							)
						),
						array_flip( $labelLanguages )
					)
				)
			);
		if (
			count( $fbChainLanguages ) > 0 &&
			!in_array( $fbChainLanguages[0], $orderedLangCodes )
		) {
			array_unshift( $orderedLangCodes,  $fbChainLanguages[0] );
		}
		return $orderedLangCodes;
	}

	/**
	 * The following captions are always shown
	 *
	 * - the first caption
	 * - the first non-empty caption in the fallback chain IF AND ONLY IF the first caption has no
	 *   value
	 *
	 * @param TermList $captions
	 * @param string[] $languageCodes
	 * @return Tag[]
	 */
	private function getCaptionsContent(
		TermList $captions,
		array $languageCodes
	) {
		$captionLayouts = [];

		$firstCaptionHasNoValue = false;
		foreach ( $languageCodes as $index => $languageCode ) {
			if ( $index == 0 ) {
				$showCaption = true;
				$firstCaptionHasNoValue = !$captions->hasTermForLanguage( $languageCode );
			} elseif (
				$index == 1 &&
				$firstCaptionHasNoValue &&
				in_array( $languageCode, $this->termFallbackChain->getFetchLanguageCodes() )
			) {
				$showCaption = true;
			} else {
				$showCaption = false;
			}
			$captionLayouts[] = $this->getSingleCaptionLayout(
				$captions,
				$languageCode,
				$showCaption
			);
		}

		return $captionLayouts;
	}

	/**
	 * @param TermList $labels
	 * @param string $languageCode
	 * @param bool $showCaption Hide the label (via styling) if false
	 *
	 * @return HorizontalLayout
	 */
	public function getSingleCaptionLayout(
		TermList $labels,
		$languageCode,
		$showCaption
	) {
		$languageName = $this->languageNameLookup->getName( $languageCode );

		// This label should be shown in the UI direction rather than the
		// language's direction since it's not editable.
		$languageElement = new LabelWidget( [
			'label' => $languageName,
			'classes' => [ 'wbmi-language-label' ]
		] );

		$captionElement = $this->getCaptionElementForLanguage(
			$labels,
			$languageCode
		);

		$classes = [ 'wbmi-entityview-caption' ];
		if ( !$showCaption ) {
			$classes[] = self::HIDEABLE_CAPTION_CLASS;
		}
		$layout = new HorizontalLayout( [
			'items' => [
				$languageElement,
				$captionElement,
			],
			'classes' => $classes,
		] );
		if ( !$showCaption ) {
			$layout->setAttributes( [
				'style' => 'display:none;',
			] );
		}
		return $layout;
	}

	private function getCaptionElementForLanguage( TermList $termList, $languageCode ) {
		$classes = [ 'wbmi-caption-value' ];
		try {
			$captionText = $termList->getByLanguage( $languageCode )->getText();
		} catch ( \OutOfBoundsException $e ) {
			$captionText = htmlspecialchars(
				$this->textProvider->get( 'wikibasemediainfo-filepage-caption-empty' )
			);
			$classes[] = self::CAPTION_EMPTY_CLASS;
		}

		$captionElement = new Element( [
			'content' => $captionText,
			'classes' => $classes,
		] );
		$captionElement->setAttributes( [
			'lang' => $languageCode,
			'dir' =>
				$this->languageDirectionalityLookup->getDirectionality( $languageCode ) ?: 'auto',
		] );
		return $captionElement;
	}

}
