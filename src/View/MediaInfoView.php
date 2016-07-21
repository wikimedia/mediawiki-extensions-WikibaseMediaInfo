<?php

namespace Wikibase\MediaInfo\View;

use InvalidArgumentException;
use MediaWiki\Linker\LinkRenderer;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\View\EntityTermsView;
use Wikibase\View\EntityView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\StatementSectionsView;
use Wikibase\View\Template\TemplateFactory;

/**
 * Class for creating HTML views for MediaInfo instances.
 *
 * @license GPL-2.0+
 * @author Adrian Heine < adrian.heine@wikimedia.de >
 */
class MediaInfoView extends EntityView {

	/**
	 * @var StatementSectionsView
	 */
	private $statementSectionsView;

	/**
	 * @var LinkRenderer
	 */
	private $linkRenderer;

	/**
	 * @var FilePageLookup
	 */
	private $filePageLookup;

	/**
	 * @param TemplateFactory $templateFactory
	 * @param EntityTermsView $entityTermsView
	 * @param StatementSectionsView $statementSectionsView
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param string $languageCode
	 * @param LinkRenderer $linkRenderer
	 * @param FilePageLookup $filePageLookup
	 */
	public function __construct(
		TemplateFactory $templateFactory,
		EntityTermsView $entityTermsView,
		StatementSectionsView $statementSectionsView,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		$languageCode,
		LinkRenderer $linkRenderer,
		FilePageLookup $filePageLookup
	) {
		parent::__construct(
			$templateFactory,
			$entityTermsView,
			$languageDirectionalityLookup,
			$languageCode
		);

		$this->statementSectionsView = $statementSectionsView;
		$this->linkRenderer = $linkRenderer;
		$this->filePageLookup = $filePageLookup;
	}

	/**
	 * @see EntityView::getMainHtml
	 *
	 * @param EntityDocument $entity
	 *
	 * @throws InvalidArgumentException
	 * @return string HTML
	 */
	protected function getMainHtml( EntityDocument $entity ) {
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entity must be a MediaInfo entity.' );
		}

		$html = $this->getFileLinkHtml( $entity->getId() );

		$html .= $this->getHtmlForTerms( $entity )
			. $this->templateFactory->render( 'wikibase-toc' )
			. $this->statementSectionsView->getHtml( $entity->getStatements() );

		return $html;
	}

	/**
	 * @see EntityView::getSideHtml
	 *
	 * @param EntityDocument $entity
	 *
	 * @return string HTML
	 */
	protected function getSideHtml( EntityDocument $entity ) {
		return '';
	}

	/**
	 * @param MediaInfoId $id
	 * @return string HTML
	 */
	private function getFileLinkHtml( MediaInfoId $id = null ) {
		if ( !$id ) {
			return '';
		}

		$title = $this->filePageLookup->getFilePage( $id );
		$html = $this->linkRenderer->makeKnownLink( $title );
		return $html;
	}

}
