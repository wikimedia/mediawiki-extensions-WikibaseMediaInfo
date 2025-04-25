<?php

declare( strict_types = 1 );

namespace Wikibase\MediaInfo;

use MediaWiki\Title\Title;
use Wikibase\Client\Hooks\WikibaseClientEntityTypesHook;
use Wikibase\Lib\Store\EntityByLinkedTitleLookup;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\Services\MediaInfoByLinkedTitleLookup;
use Wikibase\Repo\Hooks\GetEntityByLinkedTitleLookupHook;
use Wikibase\Repo\Hooks\WikibaseRepoEntityNamespacesHook;
use Wikibase\Repo\Hooks\WikibaseRepoEntityTypesHook;

/**
 * Wikibase hook handlers for the Wikibase MediaInfo extension.
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoWikibaseHooks implements
	GetEntityByLinkedTitleLookupHook,
	WikibaseClientEntityTypesHook,
	WikibaseRepoEntityTypesHook,
	WikibaseRepoEntityNamespacesHook
{

	/** @inheritDoc */
	public function onWikibaseRepoEntityNamespaces( &$entityNamespaces ): void {
		// Tell Wikibase where to put our entity content.
		$entityNamespaces[ MediaInfo::ENTITY_TYPE ] = NS_FILE . '/' . MediaInfo::ENTITY_TYPE;
	}

	private function onWikibaseEntityTypes( array &$entityTypeDefinitions ) {
		$entityTypeDefinitions = array_merge(
			$entityTypeDefinitions,
			require __DIR__ . '/../WikibaseMediaInfo.entitytypes.php'
		);
	}

	/** @inheritDoc */
	public function onGetEntityByLinkedTitleLookup( EntityByLinkedTitleLookup &$lookup ): void {
		$lookup = new MediaInfoByLinkedTitleLookup( $lookup );
	}

	/** @inheritDoc */
	public function onGetEntityContentModelForTitle( Title $title, string &$contentModel ): void {
		if ( $title->inNamespace( NS_FILE ) && $title->getArticleID() ) {
			$contentModel = MediaInfoContent::CONTENT_MODEL_ID;
		}
	}

	/** @inheritDoc */
	public function onWikibaseRepoEntityTypes( array &$entityTypeDefinitions ): void {
		$this->onWikibaseEntityTypes( $entityTypeDefinitions );
	}

	/** @inheritDoc */
	public function onWikibaseClientEntityTypes( array &$entityTypeDefinitions ): void {
		$this->onWikibaseEntityTypes( $entityTypeDefinitions );
	}
}
