<?php

namespace Wikibase\MediaInfo;

/**
 * Contains templates commonly used in server-side output generation and client-side JavaScript
 * processing.
 *
 * @license GPL-2.0-or-later
 *
 * @return array templates
 */

return call_user_func( function() {
	$templates = [];

	$templates['filepage-entityview'] =
		<<<HTML
<mw:mediainfoView>
<div id="wb-$1-$2" class="filepage-mediainfo-entityview" dir="$3">
	$4
</div>
</mw:mediainfoView>
HTML;

	return $templates;
} );
