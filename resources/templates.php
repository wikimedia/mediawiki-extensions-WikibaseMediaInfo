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

	$templates['filepage-entitytermsview'] =
		<<<HTML
<div class="filepage-mediainfo-entitytermsview">
	<!-- filepage-entitytermstable -->$1
</div>
HTML;

	$templates['filepage-entitytermstable'] =
		<<<HTML
<h3 class="mediainfo-$1-header">$2</h3>
<table class="filepage-mediainfo-entitytermstable mediainfo-$1-table" cellpadding="0" cellspacing="0" data-label-languages="$4">
	<!-- filepage-entitytermstablerow -->$3
</table>
HTML;

	$templates['filepage-entitytermstablerow'] =
		<<<HTML
<tr class="entity-terms $3" $2>
	<!-- filepage-entitytermstableelement -->$1
</tr>
HTML;

	$templates['filepage-entitytermslanguageelement'] =
		<<<HTML
<td class="language" lang="$3" dir="$2">$1 </td>
HTML;

	$templates['filepage-entitytermscaptionelement'] =
		<<<HTML
<td class="caption $4" lang="$3" dir="$2">$1 </td>
HTML;

	return $templates;
} );
