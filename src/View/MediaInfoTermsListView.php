<?php

namespace Wikibase\MediaInfo\View;

use Wikibase\Lib\LanguageNameLookup;
use Wikibase\View\Template\TemplateFactory;
use Wikibase\View\TermsListView;
use Wikibase\View\LocalizedTextProvider;
use Wikibase\View\LanguageDirectionalityLookup;

/**
 * Generates HTML to display terms of an entity in a list.
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoTermsListView extends TermsListView {

	/**
	 * @var TemplateFactory
	 */
	private $templateFactory;

	/**
	 * @var LocalizedTextProvider
	 */
	private $textProvider;

	public function __construct(
		TemplateFactory $templateFactory,
		LanguageNameLookup $languageNameLookup,
		LocalizedTextProvider $textProvider,
		LanguageDirectionalityLookup $languageDirectionalityLookup
	) {
		parent::__construct(
			$templateFactory,
			$languageNameLookup,
			$textProvider,
			$languageDirectionalityLookup
		);

		// we'll re-use these 2 properties that are private in parent, so
		// let's store them in here as well
		$this->templateFactory = $templateFactory;
		$this->textProvider = $textProvider;
	}

	/**
	 * @param string $contentHtml
	 *
	 * @return string HTML
	 */
	public function getListViewHtml( $contentHtml ) {
		return $this->templateFactory->render(
			'wikibase-entitytermsforlanguagelistview',
			htmlspecialchars( $this->textProvider->get( 'wikibase-entitytermsforlanguagelistview-language' ) ),
			htmlspecialchars( $this->textProvider->get( 'wikibasemediainfo-entitytermsforlanguagelistview-caption' ) ),
			htmlspecialchars( $this->textProvider->get( 'wikibase-entitytermsforlanguagelistview-description' ) ),
			htmlspecialchars( $this->textProvider->get( 'wikibase-entitytermsforlanguagelistview-aliases' ) ),
			$contentHtml
		);
	}

}
