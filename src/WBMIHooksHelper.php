<?php

namespace Wikibase\MediaInfo;

use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\Lookup\PropertyDataTypeLookupException;
use Wikibase\MediaInfo\View\MediaInfoEntityStatementsView;
use Wikibase\MediaInfo\View\MediaInfoEntityTermsView;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\Repo\WikibaseRepo;

/**
 * Helpers for MediaInfo hooks
 *
 * @license GPL-2.0-or-later
 */
class WBMIHooksHelper {

	/**
	 * @param PropertyId $id
	 * @return string
	 * @throws \ConfigException
	 * @throws PropertyDataTypeLookupException
	 */
	public static function getPropertyType( PropertyId $id ) {
		$propertyDataTypeLookup = WikibaseRepo::getPropertyDataTypeLookup();
		return $propertyDataTypeLookup->getDataTypeIdForProperty( $id );
	}

	public static function getMediaInfoViewRegex() {
		$tag = MediaInfoView::MEDIAINFOVIEW_CUSTOM_TAG;
		return '/<' . $tag . '[^>]*>(.*)<\/' . $tag . '>/is';
	}

	public static function getMediaInfoCaptionsRegex() {
		$tag = MediaInfoEntityTermsView::CAPTIONS_CUSTOM_TAG;
		return '/<' . $tag . '>(.*)<\/' . $tag . '>/is';
	}

	public static function getMediaInfoStatementsRegex() {
		$tag = MediaInfoEntityStatementsView::STATEMENTS_CUSTOM_TAG;
		return '/<' . $tag . '>(.*)<\/' . $tag . '>/is';
	}

	public static function getStructuredDataHeaderRegex() {
		return '#<h1\b[^>]*\bclass=(\'|")mw-slot-header\\1[^>]*>' .
			WikibaseMediaInfoHooks::MEDIAINFO_SLOT_HEADER_PLACEHOLDER . '</h1>#iU';
	}

	public static function getMaxCaptionLength() {
		$settings = WikibaseRepo::getSettings();
		return $settings->getSetting( 'string-limits' )['multilang']['length'];
	}
}
