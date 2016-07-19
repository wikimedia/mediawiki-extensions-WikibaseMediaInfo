<?php

namespace Wikibase\MediaInfo\Content;

use IContextSource;
use Page;
use Title;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\EditEntityAction;
use Wikibase\HistoryEntityAction;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\LanguageFallbackLabelDescriptionLookupFactory;
use Wikibase\MediaInfo\Actions\ViewMediaInfoAction;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\Repo\Content\EntityHandler;
use Wikibase\Repo\Store\EntityPerPage;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Store\EntityIdLookup;
use Wikibase\SubmitEntityAction;
use Wikibase\TermIndex;

/**
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoHandler extends EntityHandler {

	/**
	 * @var EntityIdLookup
	 */
	private $entityIdLookup;

	/**
	 * @var LanguageFallbackLabelDescriptionLookupFactory
	 */
	private $labelLookupFactory;

	/**
	 * @var MissingMediaInfoHandler
	 */
	private $missingMediaInfoHandler;

	/**
	 * @var FilePageLookup
	 */
	private $filePageLookup;

	/**
	 * @param EntityPerPage $entityPerPage
	 * @param TermIndex $termIndex
	 * @param EntityContentDataCodec $contentCodec
	 * @param EntityConstraintProvider $constraintProvider
	 * @param ValidatorErrorLocalizer $errorLocalizer
	 * @param EntityIdParser $entityIdParser
	 * @param EntityIdLookup $entityIdLookup
	 * @param LanguageFallbackLabelDescriptionLookupFactory $labelLookupFactory
	 * @param MissingMediaInfoHandler $missingMediaInfoHandler
	 * @param FilePageLookup $filePageLookup
	 * @param callable|null $legacyExportFormatDetector
	 */
	public function __construct(
		EntityPerPage $entityPerPage,
		TermIndex $termIndex,
		EntityContentDataCodec $contentCodec,
		EntityConstraintProvider $constraintProvider,
		ValidatorErrorLocalizer $errorLocalizer,
		EntityIdParser $entityIdParser,
		EntityIdLookup $entityIdLookup,
		LanguageFallbackLabelDescriptionLookupFactory $labelLookupFactory,
		MissingMediaInfoHandler $missingMediaInfoHandler,
		FilePageLookup $filePageLookup,
		$legacyExportFormatDetector = null
	) {
		parent::__construct(
			MediaInfoContent::CONTENT_MODEL_ID,
			$entityPerPage,
			$termIndex,
			$contentCodec,
			$constraintProvider,
			$errorLocalizer,
			$entityIdParser,
			$legacyExportFormatDetector
		);
		$this->entityIdLookup = $entityIdLookup;
		$this->labelLookupFactory = $labelLookupFactory;
		$this->missingMediaInfoHandler = $missingMediaInfoHandler;
		$this->filePageLookup = $filePageLookup;
	}

	/**
	 * @see ContentHandler::getActionOverrides
	 *
	 * @return array
	 */
	public function getActionOverrides() {
		return [
			'history' => function( Page $page, IContextSource $context = null ) {
				return new HistoryEntityAction(
					$page,
					$context,
					$this->entityIdLookup,
					$this->labelLookupFactory->newLabelDescriptionLookup( $context->getLanguage() )
				);
			},
			'view' => ViewMediaInfoAction::class,
			'edit' => EditEntityAction::class,
			'submit' => SubmitEntityAction::class,
		];
	}

	/**
	 * @return string
	 */
	protected function getContentClass() {
		return MediaInfoContent::class;
	}

	/**
	 * @return MediaInfo
	 */
	public function makeEmptyEntity() {
		return new MediaInfo();
	}

	/**
	 * @param string $id
	 *
	 * @return MediaInfoId
	 */
	public function makeEntityId( $id ) {
		return new MediaInfoId( $id );
	}

	/**
	 * @return string
	 */
	public function getEntityType() {
		return MediaInfo::ENTITY_TYPE;
	}

	/**
	 * @see EntityHandler::showMissingEntity
	 *
	 * This is overwritten to show a dummy MediaInfo entity when appropriate.
	 *
	 * @see MissingMediaInfoHandler::showMissingMediaInfo
	 *
	 * @param Title $title
	 * @param IContextSource $context
	 */
	public function showMissingEntity( Title $title, IContextSource $context ) {
		$id = $this->missingMediaInfoHandler->getMediaInfoId( $title, $context );

		if ( $id === null ) {
			// No virtual MediaInfo for this title, fall back to the default behavior
			// of displaying an error message.
			parent::showMissingEntity( $title, $context );
		} else {
			// Show a virtual MediaInfo
			$this->missingMediaInfoHandler->showVirtualMediaInfo( $id, $context );
		}
	}

	/**
	 * @param EntityId $id
	 * @return bool
	 */
	public function canCreateWithCustomId( EntityId $id ) {
		return ( $id instanceof MediaInfoId )
			&& ( $this->filePageLookup->getFilePage( $id ) !== null );
	}

	/**
	 * @return bool
	 */
	public function allowAutomaticIds() {
		return false;
	}

}
