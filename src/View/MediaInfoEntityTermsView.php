<?php

namespace Wikibase\MediaInfo\View;

use OOUI\Element;
use OOUI\HorizontalLayout;
use OOUI\LabelWidget;
use OOUI\PanelLayout;
use OOUI\Tag;
use OutputPage;
use Wikibase\DataModel\Term\TermList;
use Wikibase\LanguageFallbackChain;
use Wikibase\Lib\LanguageNameLookup;
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
	 * @var LanguageFallbackChain
	 */
	private $fallbackChain;

	const CAPTION_EMPTY_CLASS = 'wbmi-entityview-emptyCaption';
	const SHOW_CAPTION_CLASS = 'wbmi-entityview-showLabel';
	const CAPTIONS_CONTAINER = 'wbmi-entityview-captionsPanel';

	/**
	 * MediaInfoEntityTermsView constructor.
	 * @param LanguageNameLookup $languageNameLookup
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param LocalizedTextProvider $textProvider
	 * @param LanguageFallbackChain $fallbackChain
	 * @codeCoverageIgnore
	 */
	public function __construct(
		LanguageNameLookup $languageNameLookup,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		LocalizedTextProvider $textProvider,
		LanguageFallbackChain $fallbackChain
	) {
		OutputPage::setupOOUI();

		$this->languageNameLookup = $languageNameLookup;
		$this->languageDirectionalityLookup = $languageDirectionalityLookup;
		$this->textProvider = $textProvider;
		$this->fallbackChain = $fallbackChain;
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
		$layout->setAttributes( [
			'data-caption-languages' =>
				implode( ',', $this->getLanguagesOrderedByFallbackChain( $entity ) )
		] );
		return $layout->toString();
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
	 * Return the language codes for all existing labels, with the languages from the fallback
	 * chain (whether a label exists or not for the first, and only if a label exists for
	 * subsequent ones) in order at the front
	 *
	 * @param MediaInfo $entity
	 * @return array
	 */
	private function getLanguagesOrderedByFallbackChain( MediaInfo $entity ) {
		$labelLanguages = array_keys( $entity->getLabels()->toTextArray() );
		$fbChainLanguages = $this->fallbackChain->getFetchLanguageCodes();
		$orderedLangCodes =
			array_values(
				array_flip(
					array_merge(
						array_flip(
							array_intersect(
								$this->fallbackChain->getFetchLanguageCodes(),
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
	 * The following captions get a SHOW_CAPTION_CLASS html class:
	 *
	 * - the first caption
	 * - The first non-empty caption in the fallback chain IF AND ONLY IF the first caption has no
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
				in_array( $languageCode, $this->fallbackChain->getFetchLanguageCodes() )
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
		$dir = $this->languageDirectionalityLookup->getDirectionality( $languageCode );

		$languageElement = new LabelWidget( [
			'label' => $languageName,
			'classes' => [ 'wbmi-language-label' ]
		] );
		$languageElement->setAttributes( [
			'lang' => $languageCode,
			'dir' => $dir,
		] );

		$captionElement = $this->getCaptionElementForLanguage(
			$labels,
			$languageCode
		);

		$classes = [ 'wbmi-entityview-caption' ];
		if ( $showCaption ) {
			$classes[] = self::SHOW_CAPTION_CLASS;
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
