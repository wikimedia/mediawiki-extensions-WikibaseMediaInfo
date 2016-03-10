<?php

namespace Wikibase\MediaInfo\View;

use InvalidArgumentException;
use Language;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Term\Fingerprint;
use Wikibase\EntityRevision;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\EntityTermsView;
use Wikibase\View\EntityView;
use Wikibase\View\StatementSectionsView;
use Wikibase\View\Template\TemplateFactory;
use Wikibase\View\TextInjector;

/**
 * Class for creating HTML views for MediaInfo instances.
 *
 * @license GPL-2.0+
 * @author Adrian Heine < adrian.heine@wikimedia.de >
 */
class MediaInfoView extends EntityView {

	/**
	 * @var EntityTermsView
	 */
	private $entityTermsView;

	/**
	 * @var StatementSectionsView
	 */
	private $statementSectionsView;

	/**
	 * @var TextInjector
	 */
	private $textInjector;

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
	 *
	 * @return Fingerprint
	 */
	private function getFingerprint( MediaInfo $entity ) {
		return new Fingerprint( $entity->getLabels(), $entity->getDescriptions() );
	}

	/**
	 * @see EntityView::getMainHtml
	 *
	 * @param EntityRevision $entityRevision
	 *
	 * @throws InvalidArgumentException
	 * @return string HTML
	 */
	protected function getMainHtml( EntityRevision $entityRevision ) {
		$entity = $entityRevision->getEntity();

		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entityRevision must contain a MediaInfo entity.' );
		}

		$fingerprint = $this->getFingerprint( $entity );

		// FIXME should be $this->getHtmlForTermBox( $id, $entityRevision->getRevisionId() )
		$entityTermsView = $this->entityTermsView->getEntityTermsForLanguageListView(
			$fingerprint,
			[ $this->language->getCode() ]
		);

		return $this->entityTermsView->getHtml(
				$fingerprint,
				$entity->getId(),
				$entityTermsView,
				$this->textInjector
			)
			. $this->statementSectionsView->getHtml( $entity->getStatements() );
	}

	/**
	 * @see EntityView::getPlaceholders
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
	 *
	 * @param EntityDocument $entity
	 *
	 * @return string HTML
	 */
	protected function getSideHtml( EntityDocument $entity ) {
		return '';
	}

	/**
	 * @see EntityView::getTitleHtml
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
