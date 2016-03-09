<?php

namespace Wikibase\MediaInfo\View;

use InvalidArgumentException;
use Language;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Term\Fingerprint;
use Wikibase\EntityRevision;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\View\EntityView;
use Wikibase\View\EntityTermsView;
use Wikibase\View\StatementSectionsView;
use Wikibase\View\Template\TemplateFactory;
use Wikibase\View\TextInjector;

/**
 * @license GPL-2.0+
 * @author Adrian Heine <adrian.heine@wikimedia.de>
 */
class MediaInfoView extends EntityView {

	/**
	 * @var EntityTermsView
	 */
	private $entityTermsView;

	/**
	 * @var TextInjector
	 */
	private $textInjector;

	/**
	 * @var StatementSectionsView
	 */
	private $statementSectionsView;

	/**
	 * @param TemplateFactory $templateFactory
	 * @param EntityTermsView $entityTermsView
	 * @param StatementSectionsView $statementSectionsView
	 * @param Language $uiLanguage
	 */
	public function __construct(
		TemplateFactory $templateFactory,
		EntityTermsView $entityTermsView,
		StatementSectionsView $statementSectionsView,
		Language $uiLanguage
	) {
		parent::__construct( $templateFactory, $entityTermsView, $uiLanguage );
		$this->entityTermsView = $entityTermsView;
		$this->statementSectionsView = $statementSectionsView;
		$this->textInjector = new TextInjector();
	}

	/**
	 * Construct a Fingerprint holding the MediaInfo's terms for compatibility with EntityTermsView
	 *
	 * @param MediaInfo $entity
	 */
	private function getFingerprint( MediaInfo $entity ) {
		return new Fingerprint( $entity->getLabels(), $entity->getDescriptions() );
	}

	/**
	 * @see EntityView::getMainHtml
	 */
	protected function getMainHtml( EntityRevision $entityRevision ) {
		$entity = $entityRevision->getEntity();
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entityRevision must contain a MediaInfo entity.' );
		}
		$id = $entity->getId();
		$fingerprint = $this->getFingerprint( $entity );
		return $this->entityTermsView->getHtml(
				$fingerprint,
				$id,
				$this->entityTermsView->getEntityTermsForLanguageListView(
					$fingerprint,
					[ $this->language->getCode() ]
				), // FIXME should be $this->getHtmlForTermBox( $id, $entityRevision->getRevisionId() ),
				$this->textInjector
			) .
			$this->statementSectionsView->getHtml( $entity->getStatements() );
	}

	/**
	 * Returns the placeholder map build while generating HTML.
	 * The map returned here may be used with TextInjector.
	 *
	 * @return array[] string -> array
	 */
	public function getPlaceholders() {
		return array_merge(
			parent::getPlaceHolders(),
			$this->textInjector->getMarkers()
		);
	}

	/**
	 * @see EntityView::getSideHtml
	 */
	protected function getSideHtml( EntityDocument $entity ) {
		return '';
	}

	/**
	 * Returns the html used for the title of the page.
	 * @see ParserOutput::setDisplayTitle
	 *
	 * @param EntityRevision $entityRevision
	 *
	 * @return string HTML
	 */
	public function getTitleHtml( EntityRevision $entityRevision ) {
		$entity = $entityRevision->getEntity();
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entityRevision must contain a MediaInfo entity.' );
		}
		return $this->entityTermsView->getTitleHtml(
			$this->getFingerprint( $entity ),
			$entity->getId()
		);
	}

}
