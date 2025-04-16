<?php

declare( strict_types = 1 );

namespace Wikibase\MediaInfo;

use MediaWiki\HookContainer\HookContainer;
use Wikibase\Repo\Content\EntityContent;
use Wikibase\Repo\Hooks\WikibaseTextForSearchIndexHook;

/**
 * Run Wikibase hooks from WikibaseMediaInfo
 * @license GPL-2.0-or-later
 */
class MediaInfoWikibaseHookRunner implements WikibaseTextForSearchIndexHook {

	private HookContainer $hookContainer;

	public function __construct( HookContainer $hookContainer ) {
		$this->hookContainer = $hookContainer;
	}

	public function onWikibaseTextForSearchIndex( EntityContent $entityContent, string &$text ) {
		$this->hookContainer->run( 'WikibaseTextForSearchIndex', [ $entityContent, &$text ] );
	}

}
