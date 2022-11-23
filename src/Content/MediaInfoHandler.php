<?php

namespace Wikibase\MediaInfo\Content;

use Content;
use IContextSource;
use MediaWiki\Page\PageRecord;
use MediaWiki\Page\PageStore;
use Title;
use TitleFactory;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdParser;
use Wikibase\Lib\Store\EntityContentDataCodec;
use Wikibase\Lib\Store\EntityIdLookup;
use Wikibase\Lib\Store\NullEntityTermStoreWriter;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\Repo\Content\EntityHandler;
use Wikibase\Repo\Content\EntityHolder;
use Wikibase\Repo\Search\Fields\FieldDefinitions;
use Wikibase\Repo\Validators\EntityConstraintProvider;
use Wikibase\Repo\Validators\ValidatorErrorLocalizer;
use Wikibase\Search\Elastic\Fields\DescriptionsField;
use Wikibase\Search\Elastic\Fields\LabelCountField;
use Wikibase\Search\Elastic\Fields\LabelsField;
use Wikimedia\Assert\Assert;

/**
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class MediaInfoHandler extends EntityHandler {

	/**
	 * @var MissingMediaInfoHandler
	 */
	private $missingMediaInfoHandler;

	/**
	 * @var EntityIdLookup
	 */
	private $idLookup;

	/**
	 * @var FilePageLookup
	 */
	private $filePageLookup;

	/**
	 * @var Title[]
	 */
	private $titleForIdCache = [];

	/**
	 * @var PageStore
	 */
	private $pageStore;

	/**
	 * @var TitleFactory
	 */
	private $titleFactory;

	/**
	 * @param EntityContentDataCodec $contentCodec
	 * @param EntityConstraintProvider $constraintProvider
	 * @param ValidatorErrorLocalizer $errorLocalizer
	 * @param EntityIdParser $entityIdParser
	 * @param MissingMediaInfoHandler $missingMediaInfoHandler
	 * @param MediaInfoIdLookup $idLookup
	 * @param FilePageLookup $filePageLookup
	 * @param FieldDefinitions $mediaInfoFieldDefinitions
	 * @param PageStore $pageStore
	 * @param TitleFactory $titleFactory
	 * @param callable|null $legacyExportFormatDetector
	 */
	public function __construct(
		EntityContentDataCodec $contentCodec,
		EntityConstraintProvider $constraintProvider,
		ValidatorErrorLocalizer $errorLocalizer,
		EntityIdParser $entityIdParser,
		MissingMediaInfoHandler $missingMediaInfoHandler,
		MediaInfoIdLookup $idLookup,
		FilePageLookup $filePageLookup,
		FieldDefinitions $mediaInfoFieldDefinitions,
		PageStore $pageStore,
		TitleFactory $titleFactory,
		$legacyExportFormatDetector = null
	) {
		parent::__construct(
			MediaInfoContent::CONTENT_MODEL_ID,
			new NullEntityTermStoreWriter(),
			$contentCodec,
			$constraintProvider,
			$errorLocalizer,
			$entityIdParser,
			$mediaInfoFieldDefinitions,
			$legacyExportFormatDetector
		);
		$this->missingMediaInfoHandler = $missingMediaInfoHandler;
		$this->idLookup = $idLookup;
		$this->filePageLookup = $filePageLookup;
		$this->pageStore = $pageStore;
		$this->titleFactory = $titleFactory;
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
	 * @param Content $content
	 * @return array
	 * @throws \MWException
	 */
	public function getContentDataForSearchIndex( Content $content ): array {
		$fieldsData = parent::getContentDataForSearchIndex( $content );
		if ( $content->isRedirect() || !( $content instanceof MediaInfoContent ) ) {
			return $fieldsData;
		}
		$entity = $content->getEntity();
		$fields = $this->fieldDefinitions->getFields();

		foreach ( $fields as $fieldName => $field ) {
			$fieldsData[$fieldName] = $field->getFieldData( $entity );
		}

		// Labels data is normally indexed for prefix matching.
		// We don't need that for MediaInfo files, so swap labels data into descriptions
		// instead so as not to overburden the search index
		if ( isset( $fieldsData[ LabelsField::NAME ] ) ) {
			$fieldsData[DescriptionsField::NAME] = $fieldsData[LabelsField::NAME];
			$fieldsData[LabelsField::NAME] = null;
		} else {
			$fieldsData[DescriptionsField::NAME] = null;
		}

		$fieldsData[LabelCountField::NAME] = 0;
		return $fieldsData;
	}

	/**
	 * Returns the Title of the page in which this MediaInfoId is a slot
	 *
	 * @param EntityId $id
	 * @return Title|null
	 */
	public function getTitleForId( EntityId $id ) {
		'@phan-var MediaInfoId $id';
		$idString = $id->getSerialization();
		if ( !isset( $this->titleForIdCache[$idString] ) ) {
			$this->titleForIdCache[$idString] = Title::newFromID( $id->getNumericId() );
		}
		return $this->titleForIdCache[$idString];
	}

	/**
	 * Returns an array of Titles of page in which these MediaInfoIds are slots, indexed
	 * by the MediaInfoId serialization
	 *
	 * @param EntityId[] $ids
	 * @return Title[]
	 */
	public function getTitlesForIds( array $ids ) {
		'@phan-var MediaInfoId[] $ids';
		Assert::parameterElementType( 'Wikibase\MediaInfo\DataModel\MediaInfoId', $ids, '$ids' );

		$titles = [];
		$uncachedNumericIds = [];
		// get whatever cached ids we can first
		/** @var MediaInfoId $id */
		foreach ( $ids as $id ) {
			$idString = $id->getSerialization();
			if ( isset( $this->titleForIdCache[$idString] ) ) {
				$titles[$idString] = $this->titleForIdCache[$idString];
			} else {
				$uncachedNumericIds[] = $id->getNumericId();
			}
		}

		$unindexedTitles = $this->pageStore
			->newSelectQueryBuilder()
			->wherePageIds( $uncachedNumericIds )
			->caller( __METHOD__ )
			->fetchPageRecords();

		/** @var PageRecord $pageIdentity */
		foreach ( $unindexedTitles as $pageIdentity ) {
			$title = $this->titleFactory->castFromPageIdentity( $pageIdentity );

			// @phan-suppress-next-line PhanTypeMismatchArgumentNullable
			$idString = $this->getIdForTitle( $title )->getSerialization();
			// @phan-suppress-next-line PhanTypeMismatchProperty
			$this->titleForIdCache[$idString] = $title;
			$titles[$idString] = $title;
		}
		return $titles;
	}

	/**
	 * @param Title $target
	 * @return EntityId
	 */
	public function getIdForTitle( Title $target ) {
		$mediaInfoId = $this->idLookup->getEntityIdForTitle( $target );
		if ( $mediaInfoId instanceof MediaInfoId ) {
			return $mediaInfoId;
		}

		return parent::getIdForTitle( $target );
	}

}
