<?php

namespace Wikibase\MediaInfo\View;

use InvalidArgumentException;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\EntityDocumentView;
use Wikibase\View\EntityTermsView;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\StatementSectionsView;
use Wikibase\View\Template\TemplateFactory;

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
	 * @var EntityTermsView
	 */
	private $entityTermsView;

	/**
	 * @var LanguageDirectionalityLookup
	 */
	private $languageDirectionalityLookup;

	/**
	 * @var string
	 */
	protected $languageCode;

	/**
	 * @var StatementSectionsView
	 */
	private $statementSectionsView;

	/**
	 * @param TemplateFactory $templateFactory
	 * @param MediaInfoEntityTermsView $entityTermsView
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param string $languageCode
	 * @param StatementSectionsView $statementSectionsView
	 * @codeCoverageIgnore
	 */
	public function __construct(
		TemplateFactory $templateFactory,
		MediaInfoEntityTermsView $entityTermsView,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		$languageCode,
		StatementSectionsView $statementSectionsView = null
	) {
		$this->entityTermsView = $entityTermsView;
		$this->languageDirectionalityLookup = $languageDirectionalityLookup;
		$this->languageCode = $languageCode;

		$this->templateFactory = $templateFactory;
		$this->statementSectionsView = $statementSectionsView;
	}

	/**
	 * @param EntityDocument $entity
	 * @return string
	 * @codeCoverageIgnore
	 */
	public function getTitleHtml( EntityDocument $entity ) {
		return '';
	}

	public function getHtml( EntityDocument $entity ) {
		if ( !( $entity instanceof MediaInfo ) ) {
			throw new InvalidArgumentException( '$entity must be a MediaInfo entity.' );
		}

		return $this->templateFactory->render(
			'filepage-entityview',
			$entity->getType(),
			$entity->getId(),
			$this->languageDirectionalityLookup->getDirectionality( $this->languageCode ) ?: 'auto',
			$this->getTermsHtml( $entity ) . $this->getStatementsHtml( $entity )
		);
	}

	private function getTermsHtml( MediaInfo $entity ) {
		return $this->entityTermsView->getHtml(
			$entity
		);
	}

	/*
	 * @todo T204264 - will probably look something like
	 * 		return $this->statementSectionsView->getHtml( $entity->getStatements() );
	 */
	private function getStatementsHtml( MediaInfo $entity ) {
		return '';
	}

}
