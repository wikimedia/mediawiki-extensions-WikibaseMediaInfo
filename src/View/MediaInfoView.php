<?php

namespace Wikibase\MediaInfo\View;

use InvalidArgumentException;
use MediaWiki\MediaWikiServices;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\EntityDocumentView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\Template\TemplateFactory;
use Wikibase\View\ViewContent;

/**
 * Class for creating HTML views for MediaInfo instances.
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoView implements EntityDocumentView {

	/**
	 * @var TemplateFactory
	 */
	protected $templateFactory;

	/**
	 * @var MediaInfoEntityTermsView
	 */
	private $captionsView;

	/**
	 * @var LanguageDirectionalityLookup
	 */
	private $languageDirectionalityLookup;

	/**
	 * @var string
	 */
	protected $languageCode;

	/**
	 * @var MediaInfoEntityStatementsView
	 */
	private $statementsView;

	/**
	 * @param TemplateFactory $templateFactory
	 * @param MediaInfoEntityTermsView $captionsView
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param string $languageCode
	 * @param MediaInfoEntityStatementsView $statementsView
	 * @codeCoverageIgnore
	 */
	public function __construct(
		TemplateFactory $templateFactory,
		MediaInfoEntityTermsView $captionsView,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		$languageCode,
		MediaInfoEntityStatementsView $statementsView
	) {
		$this->captionsView = $captionsView;
		$this->languageDirectionalityLookup = $languageDirectionalityLookup;
		$this->languageCode = $languageCode;

		$this->templateFactory = $templateFactory;
		$this->statementsView = $statementsView;
	}

	/**
	 * @param EntityDocument $entity
	 * @return string
	 * @codeCoverageIgnore
	 */
	public function getTitleHtml( EntityDocument $entity ) {
		return '';
	}

	public function getContent( EntityDocument $entity ): ViewContent {
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entity must be a MediaInfo entity.' );
		}

		return new ViewContent(
			$this->templateFactory->render(
				'filepage-entityview',
				htmlspecialchars( $entity->getType() ),
				htmlspecialchars( $entity->getId() ),
				htmlspecialchars(
					$this->languageDirectionalityLookup->getDirectionality( $this->languageCode ) ?: 'auto'
				),
				$this->getCaptionsHtml( $entity ) . $this->getStatementsHtml( $entity )
			)
		);
	}

	private function getCaptionsHtml( MediaInfo $entity ) {
		return $this->captionsView->getHtml(
			$entity
		);
	}

	private function getStatementsHtml( MediaInfo $entity ) {
		if ( !MediaWikiServices::getInstance()->getMainConfig()->get( 'MediaInfoEnableFilePageDepicts' ) ) {
			return '';
		}
		return $this->statementsView->getHtml(
			$entity
		);
	}

}
