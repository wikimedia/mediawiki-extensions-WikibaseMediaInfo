<?php

namespace Wikibase\MediaInfo\Content;

use Article;
use IContextSource;
use Page;
use Title;
use Wikibase\Client\Store\UsageUpdater;
use Wikibase\Client\Usage\EntityUsage;
use Wikibase\Content\EntityHolder;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\EditEntityAction;
use Wikibase\EntityContent;
use Wikibase\HistoryEntityAction;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\LanguageFallbackLabelDescriptionLookupFactory;
use Wikibase\MediaInfo\Actions\ViewMediaInfoAction;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\Repo\Content\DataUpdateAdapter;
use Wikibase\Repo\Content\EntityHandler;
use Wikibase\Repo\Search\Elastic\Fields\FieldDefinitions;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Store\EntityIdLookup;
use Wikibase\SubmitEntityAction;
use Wikibase\TermIndex;
use Wikipage;

/**
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoHandler extends EntityHandler {

	const FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_TEXT = 'opening_text';
	const FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION = 'mediaInfoVersion';

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
	* @var UsageUpdater
	*/
	private $usageUpdater;

	/**
	 * @param TermIndex $termIndex
	 * @param EntityContentDataCodec $contentCodec
	 * @param EntityConstraintProvider $constraintProvider
	 * @param ValidatorErrorLocalizer $errorLocalizer
	 * @param EntityIdParser $entityIdParser
	 * @param EntityIdLookup $entityIdLookup
	 * @param LanguageFallbackLabelDescriptionLookupFactory $labelLookupFactory
	 * @param MissingMediaInfoHandler $missingMediaInfoHandler
	 * @param FilePageLookup $filePageLookup
	 * @param FieldDefinitions $mediaInfoFieldDefinitions
	 * @param UsageUpdater $usageUpdater
	 * @param callable|null $legacyExportFormatDetector
	 */
	public function __construct(
		TermIndex $termIndex,
		EntityContentDataCodec $contentCodec,
		EntityConstraintProvider $constraintProvider,
		ValidatorErrorLocalizer $errorLocalizer,
		EntityIdParser $entityIdParser,
		EntityIdLookup $entityIdLookup,
		LanguageFallbackLabelDescriptionLookupFactory $labelLookupFactory,
		MissingMediaInfoHandler $missingMediaInfoHandler,
		FilePageLookup $filePageLookup,
		FieldDefinitions $mediaInfoFieldDefinitions,
		UsageUpdater $usageUpdater,
		$legacyExportFormatDetector = null
	) {
		parent::__construct(
			MediaInfoContent::CONTENT_MODEL_ID,
			$termIndex,
			$contentCodec,
			$constraintProvider,
			$errorLocalizer,
			$entityIdParser,
			$mediaInfoFieldDefinitions,
			$legacyExportFormatDetector
		);
		$this->entityIdLookup = $entityIdLookup;
		$this->labelLookupFactory = $labelLookupFactory;
		$this->missingMediaInfoHandler = $missingMediaInfoHandler;
		$this->filePageLookup = $filePageLookup;
		$this->usageUpdater = $usageUpdater;
	}

	/**
	 * @see ContentHandler::getActionOverrides
	 *
	 * @return array
	 */
	public function getActionOverrides() {
		return [
			'history' => function( Page $page, IContextSource $context ) {
				// NOTE: for now, the callback must work with a WikiPage as well as an Article
				// object. Once I0335100b2 is merged, this is no longer needed.
				if ( $page instanceof WikiPage ) {
					$page = Article::newFromWikiPage( $page, $context );
				}

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
	 * @return MediaInfo
	 */
	public function makeEmptyEntity() {
		return new MediaInfo();
	}

	/**
	 * @see EntityHandler::newEntityContent
	 *
	 * @param EntityHolder|null $entityHolder
	 *
	 * @return MediaInfoContent
	 */
	public function newEntityContent( EntityHolder $entityHolder = null ) {
		return new MediaInfoContent( $entityHolder );
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

	/**
	 * Returns data for writing to the search index for File page corresponding to
	 * the MediaInfo item
	 *
	 * @param WikiPage $page
	 * @return array
	 * @todo Replace the part where the entity data is populated with a
	 *  call to parent::getEntityDataForSearchIndex
	 */
	public function getDataForFilePageSearchIndex(
		WikiPage $page
	) {
		$fieldsData = [];
		$content = $page->getContent();
		if ( ( $content instanceof EntityContent ) && !$content->isRedirect() ) {
			$entity = $content->getEntity();
			$fields = $this->fieldDefinitions->getFields();

			foreach ( $fields as $fieldName => $field ) {
				$fieldsData[$fieldName] = $field->getFieldData( $entity );
			}
		}

		$fieldsData[self::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_TEXT] = $content->getTextForSearchIndex();
		// Add the MediaInfo revision id, so that we can add a revision check for it when updating
		// the File page data
		$fieldsData[self::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION] = $page->getRevision()->getId();

		return $fieldsData;
	}

	/**
	 * Notify File page that the MediaInfo item has been modified
	 *
	 * @see Content::getSecondaryDataUpdates
	 *
	 * @param EntityContent $content
	 * @param Title $title
	 *
	 * @return \DataUpdate[]
	 */
	public function getEntityModificationUpdates( EntityContent $content, Title $title ) {
		$updates = parent::getEntityModificationUpdates( $content, $title );
		$updates[] = new DataUpdateAdapter(
			function () use ( $content ) {
				$filePageTitle = $this->filePageLookup->getFilePage( $content->getEntityId() );
				if ( $filePageTitle ) {
					$usage = new EntityUsage( $content->getEntityId(), EntityUsage::ALL_USAGE );
					$this->usageUpdater->addUsagesForPage(
						$filePageTitle->getArticleID(),
						[ $usage ]
					);
				}
			}
		);
		return $updates;
	}

}
