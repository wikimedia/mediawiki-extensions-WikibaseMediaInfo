<?php

namespace Wikibase\MediaInfo\Content;

use IContextSource;
use Title;
use Wikibase\Content\EntityHolder;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\Repo\Content\EntityHandler;
use Wikibase\Repo\Search\Fields\FieldDefinitions;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Search\Elastic\Fields\DescriptionsField;
use Wikibase\Search\Elastic\Fields\LabelCountField;
use Wikibase\Search\Elastic\Fields\LabelsField;
use Wikibase\TermIndex;

/**
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoHandler extends EntityHandler {

	const FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_TEXT = 'opening_text';
	const FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_VERSION = 'mediaInfoVersion';

	/**
	 * @var MissingMediaInfoHandler
	 */
	private $missingMediaInfoHandler;

	/**
	 * @var FilePageLookup
	 */
	private $filePageLookup;

	/**
	 * @param TermIndex $termIndex
	 * @param EntityContentDataCodec $contentCodec
	 * @param EntityConstraintProvider $constraintProvider
	 * @param ValidatorErrorLocalizer $errorLocalizer
	 * @param EntityIdParser $entityIdParser
	 * @param MissingMediaInfoHandler $missingMediaInfoHandler
	 * @param FilePageLookup $filePageLookup
	 * @param FieldDefinitions $mediaInfoFieldDefinitions
	 * @param callable|null $legacyExportFormatDetector
	 */
	public function __construct(
		TermIndex $termIndex,
		EntityContentDataCodec $contentCodec,
		EntityConstraintProvider $constraintProvider,
		ValidatorErrorLocalizer $errorLocalizer,
		EntityIdParser $entityIdParser,
		MissingMediaInfoHandler $missingMediaInfoHandler,
		FilePageLookup $filePageLookup,
		FieldDefinitions $mediaInfoFieldDefinitions,
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
		$this->missingMediaInfoHandler = $missingMediaInfoHandler;
		$this->filePageLookup = $filePageLookup;
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
	 * Returns data for writing to the search index for a MediaInfo slot
	 *
	 * @param MediaInfoContent $content
	 * @return array
	 */
	public function getSlotDataForSearchIndex(
		MediaInfoContent $content
	) {
		$fieldsData = [];
		if ( !$content->isRedirect() ) {
			$entity = $content->getEntity();
			$fields = $this->fieldDefinitions->getFields();

			foreach ( $fields as $fieldName => $field ) {
				$fieldsData[$fieldName] = $field->getFieldData( $entity );
			}

			$fieldsData[self::FILE_PAGE_SEARCH_INDEX_KEY_MEDIAINFO_TEXT] =
				$content->getTextForSearchIndex();

			// Labels data is normally indexed for prefix matching.
			// We don't need that for MediaInfo files, so swap labels data into descriptions
			// instead so as not to overburden the search index
			if ( isset( $fieldsData[ LabelsField::NAME ] ) ) {
				$fieldsData[DescriptionsField::NAME] = $fieldsData[LabelsField::NAME];
				$fieldsData[LabelsField::NAME] = [];
			}
			$fieldsData[LabelCountField::NAME] = 0;
		}

		return $fieldsData;
	}

	/**
	 * Returns the Title of the page in which this MediaInfo item is a slot
	 *
	 * @param EntityId $id
	 *
	 * @return Title
	 */
	public function getTitleForId( EntityId $id ) {
		'@phan-var MediaInfoId $id';
		return Title::newFromID( $id->getNumericId() );
	}

	/**
	 * @param Title $target
	 * @return EntityId
	 */
	public function getIdForTitle( Title $target ) {
		if ( $target->inNamespace( NS_FILE ) && $target->getArticleID() ) {
			return new MediaInfoId( 'M' . $target->getArticleID() );
		}
		return parent::getIdForTitle( $target );
	}

}
