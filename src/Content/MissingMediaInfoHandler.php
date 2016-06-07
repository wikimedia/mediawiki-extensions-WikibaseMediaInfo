<?php

namespace Wikibase\MediaInfo\Content;

use Html;
use IContextSource;
use Language;
use MediaWiki\Linker\LinkTarget;
use OutputPage;
use Title;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\FilePageLookup;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;
use Wikibase\Repo\ParserOutput\EntityParserOutputGeneratorFactory;

/**
 * Handler for missing MediaInfo entities.
 *
 * @license GPL-2.0+
 * @author Daniel Kinzler
 */
class MissingMediaInfoHandler {

	/**
	 * @var MediaInfoIdLookup
	 */
	private $idLookup;

	/**
	 * @var FilePageLookup
	 */
	private $filePageLookup;

	/**
	 * @var EntityParserOutputGeneratorFactory
	 */
	private $outputGeneratorFactory;

	/**
	 * MissingMediaInfoHandler constructor.
	 *
	 * @param MediaInfoIdLookup $idLookup
	 * @param FilePageLookup $filePageLookup
	 * @param EntityParserOutputGeneratorFactory $outputGeneratorFactory
	 */
	public function __construct(
		MediaInfoIdLookup $idLookup,
		FilePageLookup $filePageLookup,
		EntityParserOutputGeneratorFactory $outputGeneratorFactory
	) {
		$this->idLookup = $idLookup;
		$this->filePageLookup = $filePageLookup;
		$this->outputGeneratorFactory = $outputGeneratorFactory;
	}

	/**
	 * Returns the MediaInfoId that corresponds to the given $title, if the title is
	 * valid for a MediaInfo entity, and a corresponding File page exists. If the title
	 * does not correspond to a valid MediaInfoId or no corresponding File page exists,
	 * this methods returns null. In other words, if this methods returns a MediaInfoId,
	 * that ID can be used to show a "virtual" MediaInfo entity.
	 *
	 * @see EntityHandler::showMissingEntity
	 *
	 * @param LinkTarget $title The title of the page that potentially could, but does not,
	 *        contain an entity.
	 * @param IContextSource $context Context to use for reporting. In particular, output
	 *        will be written to $context->getOutput().
	 *
	 * @return MediaInfoId|null
	 */
	public function getMediaInfoId( LinkTarget $title, IContextSource $context ) {
		$mediaInfoId = $this->idLookup->getIdFromLinkTarget( $title );

		if ( $mediaInfoId === null ) {
			return null;
		}

		$filePageTitle = $this->filePageLookup->getFilePage( $mediaInfoId );

		if ( $filePageTitle === null || !$filePageTitle->exists() ) {
			return null;
		}

		return $mediaInfoId;
	}

	/**
	 * Display a "virtual" (empty) MediaInfo entity with the given ID.
	 *
	 * @see EntityHandler::showMissingEntity
	 *
	 * @param MediaInfoId $mediaInfoId The ID of the virtual MediaInfo entity to show.
	 * @param IContextSource $context Context to use for display. In particular, output
	 *        will be written to $context->getOutput(), and the output language is determined
	 *        by $context->getLanguage().
	 */
	public function showVirtualMediaInfo( MediaInfoId $mediaInfoId, IContextSource $context ) {
		$userLanguage = $context->getLanguage();
		$outputPage = $context->getOutput();

		// show an empty MediaInfo
		$outputGenerator = $this->outputGeneratorFactory->
			getEntityParserOutputGenerator( $userLanguage->getCode(), true );

		$mediaInfo = new MediaInfo( $mediaInfoId );
		$parserOutput = $outputGenerator->getParserOutput( $mediaInfo, true );

		$outputPage->addParserOutput( $parserOutput );
	}

}
