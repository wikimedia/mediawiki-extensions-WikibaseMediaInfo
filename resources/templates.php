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
<div id="wb-$1-$2" class="filepage-entityview" dir="$3">
	$4
</div>
HTML;

	$templates['filepage-entitytermsview'] =
		<<<HTML
<div class="filepage-entitytermsview">
	<!-- filepage-entitytermstable -->$1
</div>
HTML;

	$templates['filepage-entitytermstable'] =
		<<<HTML
<h3 class="mediainfo-$1-header">$2</h3>
<table class="filepage-entitytermstable mediainfo-$1-table" cellpadding="0" cellspacing="0">
	<!-- filepage-entitytermstablerow -->$3
</table>
HTML;

	$templates['filepage-entitytermstablerow'] =
		<<<HTML
<tr class="entity-terms">
	<!-- filepage-entitytermstableelement -->$1
</tr>
HTML;

	$templates['filepage-entitytermslanguageelement'] =
		<<<HTML
<td class="language" lang="$3" dir="$2">$1</td>
HTML;

	$templates['filepage-entitytermscaptionelement'] =
		<<<HTML
<td class="caption" lang="$3" dir="$2">$1</td>
HTML;

	return $templates;
} );
