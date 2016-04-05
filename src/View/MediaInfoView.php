<?php

namespace Wikibase\MediaInfo\View;

use InvalidArgumentException;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\DataModel\Term\Fingerprint;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\EntityTermsView;
use Wikibase\View\EntityView;
use Wikibase\View\LanguageDirectionalityLookup;
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
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param string $languageCode
	 */
	public function __construct(
		TemplateFactory $templateFactory,
		EntityTermsView $entityTermsView,
		StatementSectionsView $statementSectionsView,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		$languageCode
	) {
		parent::__construct(
			$templateFactory, $entityTermsView, $languageDirectionalityLookup, $languageCode
		);

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
	 * @param EntityDocument $entity
	 *
	 * @throws InvalidArgumentException
	 * @return string HTML
	 */
	protected function getMainHtml( EntityDocument $entity ) {
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entity must be a MediaInfo entity.' );
		}

		return $this->entityTermsView->getHtml(
				$this->getFingerprint( $entity ),
				$entity->getId(),
				$this->getHtmlForTermBox(),
				$this->textInjector
			)
			. $this->statementSectionsView->getHtml( $entity->getStatements() );
	}

	/**
	 * @return string HTML
	 */
	private function getHtmlForTermBox() {
		// Placeholder for a termbox for the present item.
		return $this->textInjector->newMarker( 'termbox' );
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
	 * @param EntityDocument $entity
	 *
	 * @throws InvalidArgumentException
	 * @return string HTML
	 */
	public function getTitleHtml( EntityDocument $entity ) {
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entity must be a MediaInfo entity.' );
		}
		return $this->entityTermsView->getTitleHtml(
			$this->getFingerprint( $entity ),
			$entity->getId()
		);
	}

}
