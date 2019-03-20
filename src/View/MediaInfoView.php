<?php

namespace Wikibase\MediaInfo\View;

use Html;
use InvalidArgumentException;
use MediaWiki\MediaWikiServices;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\EntityDocumentView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\ViewContent;

/**
 * Class for creating HTML views for MediaInfo instances.
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoView implements EntityDocumentView {

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

	const MEDIAINFOVIEW_CUSTOM_TAG = 'mediaInfoView';

	/**
	 * @param MediaInfoEntityTermsView $captionsView
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param string $languageCode
	 * @param MediaInfoEntityStatementsView $statementsView
	 * @codeCoverageIgnore
	 */
	public function __construct(
		MediaInfoEntityTermsView $captionsView,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		$languageCode,
		MediaInfoEntityStatementsView $statementsView
	) {
		$this->captionsView = $captionsView;
		$this->languageDirectionalityLookup = $languageDirectionalityLookup;
		$this->languageCode = $languageCode;

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

	public function getContent( EntityDocument $entity, $revision = null ): ViewContent {
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entity must be a MediaInfo entity.' );
		}

		return new ViewContent(
			// Wrap the whole thing in a custom tag so we can manipulate its position on the page
			// later on
			Html::rawElement(
				self::MEDIAINFOVIEW_CUSTOM_TAG,
				[],
				$this->getCaptionsHtml( $entity ) . $this->getStatementsHtml( $entity )
			)
		);
	}

	public function getCaptionsHtml( MediaInfo $entity ) {
		return $this->captionsView->getHtml(
			$entity
		);
	}

	public function getStatementsHtml( MediaInfo $entity ) {
		if ( !MediaWikiServices::getInstance()->getMainConfig()->get( 'MediaInfoEnableFilePageDepicts' ) ) {
			return '';
		}
		return $this->statementsView->getHtml(
			$entity
		);
	}

}
