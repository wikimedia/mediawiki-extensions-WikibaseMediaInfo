<?php

namespace Wikibase\MediaInfo\View;

use OOUI\HtmlSnippet;
use OOUI\PanelLayout;
use OutputPage;
use Wikibase\DataModel\Term\TermList;
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
	 * Array of language codes specified by user
	 *
	 * @var string[]
	 */
	private $userLanguages;

	/**
	 * MediaInfoEntityTermsView constructor.
	 * @param TemplateFactory $templateFactory
	 * @param LanguageNameLookup $languageNameLookup
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param LocalizedTextProvider $textProvider
	 * @param array $userLanguages
	 * @codeCoverageIgnore
	 */
	public function __construct(
		TemplateFactory $templateFactory,
		LanguageNameLookup $languageNameLookup,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		LocalizedTextProvider $textProvider,
		array $userLanguages
	) {
		OutputPage::setupOOUI();

		$this->templateFactory = $templateFactory;
		$this->languageNameLookup = $languageNameLookup;
		$this->languageDirectionalityLookup = $languageDirectionalityLookup;
		$this->textProvider = $textProvider;
		$this->userLanguages = array_reverse( $userLanguages );
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
				$this->getLanguagesWithUsersLanguagesFirst( $entity )
			)
		);
	}

	private function getLanguagesWithUsersLanguagesFirst( MediaInfo $entity ) {
		$languages = array_keys( $entity->getLabels()->toTextArray() );
		foreach ( $languages as $index => $langCode ) {
			if ( in_array( $langCode, $this->userLanguages ) ) {
				unset( $languages[ $index ] );
				array_unshift( $languages, $langCode );
			}
		}
		return $languages;
	}

	/**
	 * @param TermList $labels
	 * @param string[] $languageCodes The languages the user requested to be shown
	 *
	 * @return string HTML
	 */
	private function getLabelsHtml(
		TermList $labels,
		array $languageCodes
	) {
		$labelsHtml = '';

		foreach ( $languageCodes as $languageCode ) {
			$labelsHtml .= $this->getSingleLabelHtml(
				$labels,
				$languageCode
			);
		}

		return $this->getLabelsPlusContext( $labelsHtml );
	}

	/**
	 * @param TermList $labels
	 * @param string $languageCode
	 *
	 * @return string HTML
	 */
	private function getSingleLabelHtml(
		TermList $labels,
		$languageCode
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
			$languageElement . $labelElement
		);
	}

	/**
	 * @param string $contentHtml
	 *
	 * @return string HTML
	 */
	private function getLabelsPlusContext( $contentHtml ) {

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
					$contentHtml
				)
			),
		] );
		return $layout->toString();
	}

	private function renderLabelForLanguage( TermList $termList, $languageCode ) {
		return $this->templateFactory->render(
			'filepage-entitytermscaptionelement',
			htmlspecialchars( $termList->getByLanguage( $languageCode )->getText() ),
			htmlspecialchars(
				$this->languageDirectionalityLookup->getDirectionality( $languageCode ) ?: 'auto'
			),
			htmlspecialchars( $languageCode )
		);
	}

}
