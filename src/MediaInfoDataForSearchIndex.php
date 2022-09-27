<?php

namespace Wikibase\MediaInfo;

use ContentHandler;
use MediaWiki\Content\ContentHandlerFactory;
use MediaWiki\Content\Hook\SearchDataForIndex2Hook;
use MediaWiki\Revision\RevisionRecord;
use ParserOutput;
use SearchEngine;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikimedia\Assert\Assert;
use WikiPage;

/**
 * Media info data is not stored in the main slot and thus the corresponding
 * ContentHandler will never be called by the main slot ContentHandler.
 * MW Core lacks support for such scenario, so we rely on a hook to inject the mediainfo
 * slot content data into the search index.
 */
class MediaInfoDataForSearchIndex implements SearchDataForIndex2Hook {
	/**
	 * @var ContentHandlerFactory
	 */
	private $contentHandlerFactory;

	public function __construct( ContentHandlerFactory $contentHandlerFactory ) {
		$this->contentHandlerFactory = $contentHandlerFactory;
	}

	/**
	 * @inheritDoc
	 */
	public function onSearchDataForIndex2(
		array &$fields,
		ContentHandler $handler,
		WikiPage $page,
		ParserOutput $output,
		SearchEngine $engine,
		RevisionRecord $revision
	) {
		if ( !$revision->hasSlot( MediaInfo::ENTITY_TYPE ) ) {
			return;
		}
		$content = $revision->getContent( MediaInfo::ENTITY_TYPE );
		if ( $content === null ) {
			return;
		}
		$contentHandler = $this->contentHandlerFactory->getContentHandler( $content->getModel() );
		Assert::invariant( $contentHandler instanceof MediaInfoHandler,
			"Expected a MediaInfoHandler for the ContentHandler of the content of a MediaInfo slot" );
		/** @var $contentHandler MediaInfoHandler */
		$fields += $contentHandler->getContentDataForSearchIndex( $content );
	}
}
