<?php

namespace Wikibase\MediaInfo\View;

use Html;
use InvalidArgumentException;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\EntityDocumentView;
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
	 * @var string
	 */
	protected $languageCode;

	/**
	 * @var MediaInfoEntityStatementsView
	 */
	private $statementsView;

	public const MEDIAINFOVIEW_CUSTOM_TAG = 'mediaInfoView';

	/**
	 * @param MediaInfoEntityTermsView $captionsView
	 * @param string $languageCode
	 * @param MediaInfoEntityStatementsView $statementsView
	 * @codeCoverageIgnore
	 */
	public function __construct(
		MediaInfoEntityTermsView $captionsView,
		$languageCode,
		MediaInfoEntityStatementsView $statementsView
	) {
		$this->captionsView = $captionsView;
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
				// Hide this custom tag by default: it's only really used to signal the boundaries
				// of MediaInfo content, and we'll extract the relevant parts out of this if
				// MediaInfo is installed.
				// If MediaInfo is not installed, however (e.g. pulling in content from another
				// wiki, or MediaInfo is uninstalled), this routine won't happen, styles and
				// scripts to ensure this view works properly aren't loaded, etc, so we'd
				// rather not have this content show up at all in that case...
				[ 'style' => 'display: none' ],
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
		return $this->statementsView->getHtml(
			$entity
		);
	}

}
