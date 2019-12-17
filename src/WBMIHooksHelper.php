<?php

namespace Wikibase\MediaInfo;

use MediaWiki\MediaWikiServices;
use Wikibase\DataModel\Entity\PropertyId;
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
	 */
	public static function getPropertyType( PropertyId $id ) {
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$propertyDataTypeLookup = $wbRepo->getPropertyDataTypeLookup();
		return $propertyDataTypeLookup->getDataTypeIdForProperty( $id );
	}

	/**
	 * @param PropertyId $id
	 * @return string
	 * @throws \ConfigException
	 */
	public static function getValueType( PropertyId $id ) {
		$mwConfig = MediaWikiServices::getInstance()->getMainConfig();
		$dataTypes = $mwConfig->get( 'WBRepoDataTypes' );
		$propertyDatatype = static::getPropertyType( $id );
		return $dataTypes['PT:' . $propertyDatatype]['value-type'];
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
		global $wgWBRepoSettings;
		return $wgWBRepoSettings['string-limits']['multilang']['length'];
	}
}
