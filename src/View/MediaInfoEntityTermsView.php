<?php

namespace Wikibase\MediaInfo\View;

use OOUI\HtmlSnippet;
use OOUI\PanelLayout;
use OutputPage;
use Wikibase\DataModel\Term\TermList;
use Wikibase\LanguageFallbackChain;
use Wikibase\Lib\LanguageNameLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;
use Wikibase\View\Template\TemplateFactory;

/**
 * Generates HTML to display the terms of a MediaInfo entity
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityTermsView {

	/**
	 * @var TemplateFactory
	 */
	private $templateFactory;

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

	const LABEL_EMPTY_CLASS = 'wbmi-empty';
	const SHOW_LABEL_CLASS = 'showLabel';

	/**
	 * MediaInfoEntityTermsView constructor.
	 * @param TemplateFactory $templateFactory
	 * @param LanguageNameLookup $languageNameLookup
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param LocalizedTextProvider $textProvider
	 * @param LanguageFallbackChain $fallbackChain
	 * @codeCoverageIgnore
	 */
	public function __construct(
		TemplateFactory $templateFactory,
		LanguageNameLookup $languageNameLookup,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		LocalizedTextProvider $textProvider,
		LanguageFallbackChain $fallbackChain
	) {
		OutputPage::setupOOUI();

		$this->templateFactory = $templateFactory;
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
		return $this->templateFactory->render(
			'filepage-entitytermsview',
			$this->getLabelsHtml(
				$entity->getLabels(),
				$this->getLanguagesOrderedByFallbackChain( $entity )
			)
		);
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
	 * The following labels get a SHOW_LABEL_CLASS html class:
	 *
	 * - the first label
	 * - The first non-empty label in the fallback chain IF AND ONLY IF the first label has no
	 *   value
	 *
	 * @param TermList $labels
	 * @param string[] $languageCodes
	 * @return string HTML
	 */
	private function getLabelsHtml(
		TermList $labels,
		array $languageCodes
	) {
		$labelsHtml = '';

		$firstLabelHasNoValue = false;
		foreach ( $languageCodes as $index => $languageCode ) {
			if ( $index == 0 ) {
				$showLabel = true;
				$firstLabelHasNoValue = !$labels->hasTermForLanguage( $languageCode );
			} elseif (
				$index == 1 &&
				$firstLabelHasNoValue &&
				in_array( $languageCode, $this->fallbackChain->getFetchLanguageCodes() )
			) {
				$showLabel = true;
			} else {
				$showLabel = false;
			}
			$labelsHtml .= $this->getSingleLabelHtml(
				$labels,
				$languageCode,
				$showLabel
			);
		}

		return $this->getLabelsPlusContext( $labelsHtml, $languageCodes );
	}

	/**
	 * @param TermList $labels
	 * @param string $languageCode
	 * @param bool $showLabel Hide the label (via styling) if false
	 *
	 * @return string HTML
	 */
	public function getSingleLabelHtml(
		TermList $labels,
		$languageCode,
		$showLabel
	) {
		$languageName = $this->languageNameLookup->getName( $languageCode );
		$dir = $this->languageDirectionalityLookup->getDirectionality( $languageCode );

		$languageElement = $this->templateFactory->render(
			'filepage-entitytermslanguageelement',
			htmlspecialchars( $languageName ),
			htmlspecialchars( $dir ),
			htmlspecialchars( $languageCode )
		);
		$labelElement = $this->renderLabelForLanguage(
			$labels,
			$languageCode
		);

		return $this->templateFactory->render(
			'filepage-entitytermstablerow',
			$languageElement . $labelElement,
			$showLabel ? '' : 'style="display: none;"',
			$showLabel ? self::SHOW_LABEL_CLASS : ''
		);
	}

	private function getLabelsPlusContext( $contentHtml, array $languageCodes ) {

		$layout = new PanelLayout( [
			'scrollable' => false,
			'padded' => false,
			'expanded' => false,
			'framed' => true,
			'content' => new HtmlSnippet(
				$this->templateFactory->render(
					'filepage-entitytermstable',
					'captions',
					htmlspecialchars(
						$this->textProvider->get(
							'wikibasemediainfo-entitytermsforlanguagelistview-caption'
						)
					),
					$contentHtml,
					implode( ',', $languageCodes )
				)
			),
		] );
		return $layout->toString();
	}

	private function renderLabelForLanguage( TermList $termList, $languageCode ) {
		try {
			$labelText = $termList->getByLanguage( $languageCode )->getText();
			$labelClass = '';
		} catch ( \OutOfBoundsException $e ) {
			$labelText = htmlspecialchars(
				$this->textProvider->get( 'wikibasemediainfo-filepage-caption-empty' )
			);
			$labelClass = self::LABEL_EMPTY_CLASS;
		}

		return $this->templateFactory->render(
			'filepage-entitytermscaptionelement',
			$labelText,
			htmlspecialchars(
				$this->languageDirectionalityLookup->getDirectionality( $languageCode ) ?: 'auto'
			),
			htmlspecialchars( $languageCode ),
			$labelClass
		);
	}

}
