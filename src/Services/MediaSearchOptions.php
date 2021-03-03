<?php

namespace Wikibase\MediaInfo\Services;

use Config;
use MediaWiki\MediaWikiServices;
use MessageLocalizer;
use Wikibase\Search\Elastic\Query\HasLicenseFeature;

/**
 * @license GPL-2.0-or-later
 * @author Eric Gardner
 */
class MediaSearchOptions {

	/** @var MessageLocalizer */
	private $context;

	/** @var Config */
	private $config;

	/**
	 * @param MessageLocalizer $context
	 * @param Config $config
	 */
	public function __construct( MessageLocalizer $context, Config $config ) {
		$this->context = $context;
		$this->config = $config;
	}

	/**
	 * Generate an associative array that combines all options for filter,
	 * sort, and licenses for all media types, with labels in the appropriate
	 * language.
	 *
	 * @param MessageLocalizer $context
	 * @return array
	 */
	public static function getSearchOptions( MessageLocalizer $context ) : array {
		$instance = new static(
			$context,
			MediaWikiServices::getInstance()
				->getConfigFactory()
				->makeConfig( 'WikibaseCirrusSearch' )
		);

		$types = [ 'bitmap', 'audio', 'video', 'page', 'other' ];
		$searchOptions = [];

		// Some options are only present for certain media types.
		// The methods which generate type-specific options take a mediatype
		// argument and will return false if the given type does not support the
		// options in question.

		// The $context object must be passed down to the various helper methods
		// because getSearchOptions can be called both as a ResourceLoader callback
		// as well as during SpecialMediaSearch->execute(); we need to make sure
		// the messages can be internationalized in the same way regardless
		foreach ( $types as $type ) {
			$searchOptions[ $type ] = array_filter( [
				'license' => $instance->getLicenseGroups( $type ),
				'mimeType' => $instance->getMimeTypes( $type ),
				'imageSize' => $instance->getImageSizes( $type ),
				'sort' => $instance->getSorts()
			] );
		}

		return $searchOptions;
	}

	/**
	 * Get the size options. Only supported by "bitmap" type.
	 *
	 * @param string $mediaType
	 * @return array
	 */
	private function getImageSizes( string $mediaType ) : array {
		if ( $mediaType === 'bitmap' ) {
			return [
				[
					'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-size-any' )->text(),
					'value' => ''
				],
				[
					'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-size-small' )->text(),
					'value' => '<500'
				],
				[
					// phpcs:ignore Generic.Files.LineLength.TooLong
					'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-size-medium' )->text(),
					'value' => '500,1000'
				],
				[
					'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-size-large' )->text(),
					'value' => '>1000'
				],
			];
		} else {
			return [];
		}
	}

	/**
	 * Get the mimetype options for a given mediatype. All types except "page"
	 * support this option.
	 *
	 * @param string $mediaType
	 * @return array
	 */
	private function getMimeTypes( string $mediaType ) : array {
		switch ( $mediaType ) {
			case 'bitmap':
				return [
					[
						// phpcs:ignore Generic.Files.LineLength.TooLong
						'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-file-type-any' )->text(),
						'value' => ''
					],
					[
						'label' => 'tiff',
						'value' => 'tiff'
					],
					[
						'label' => 'png',
						'value' => 'png'
					],
					[
						'label' => 'gif',
						'value' => 'gif'
					],
					[
						'label' => 'jpg',
						'value' => 'jpeg'
					],
					[
						'label' => 'webp',
						'value' => 'webp'
					],
					[
						'label' => 'xcf',
						'value' => 'xcf'
					],
					[
						'label' => 'svg',
						'value' => 'svg'
					]
				];
			case 'audio':
				return [
					[
						// phpcs:ignore Generic.Files.LineLength.TooLong
						'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-file-type-any' )->text(),
						'value' => ''
					],
					[
						'label' => 'mid',
						'value' => 'midi'
					],
					[
						'label' => 'flac',
						'value' => 'flac'
					],
					[
						'label' => 'wav',
						'value' => 'wav'
					],
					[
						'label' => 'mp3',
						'value' => 'mpeg'
					],
					[
						'label' => 'ogg',
						'value' => 'ogg'
					]
				];
			case 'video' :
				return [
					[
						// phpcs:ignore Generic.Files.LineLength.TooLong
						'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-file-type-any' )->text(),
						'value' => ''
					],
					[
						'label' => 'webm',
						'value' => 'webm'
					],
					[
						'label' => 'mpg',
						'value' => 'mpeg'
					],
					[
						'label' => 'ogg',
						'value' => 'ogg'
					]
				];
			case 'other':
				return [
					[
						// phpcs:ignore Generic.Files.LineLength.TooLong
						'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-file-type-any' )->text(),
						'value' => ''
					],
					[
						'label' => 'pdf',
						'value' => 'pdf'
					],
					[
						'label' => 'djvu',
						'value' => 'djvu'
					],
					[
						'label' => 'stl',
						'value' => 'sla'
					]
				];
			case 'page':
			default:
				return [];
		}
	}

	/**
	 * Get the sort options for each media type. Supported by all types.
	 *
	 * @return array
	 */
	private function getSorts() : array {
		return [
			[
				'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-sort-default' )->text(),
				'value' => ''
			],
			[
				'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-sort-recency' )->text(),
				'value' => 'recency'
			]
		];
	}

	/**
	 * Parse the on-wiki license mapping page (if one exists) and return an
	 * array of arrays, structured like:
	 * [ [ 'label' => 'some-label-text', 'value' => 'cc-by' ] ]
	 * With one child array for each license group defined in the mapping.
	 *
	 * Supported by all types except "page" type.
	 *
	 * @param string $mediaType
	 * @return array
	 */
	private function getLicenseGroups( string $mediaType ) : array {
		// Category & page searches do not have license filters
		if ( $mediaType === 'page' ) {
			return [];
		}

		$licenseMappings = HasLicenseFeature::getConfiguredLicenseMap( $this->config );
		if ( !$licenseMappings ) {
			return [];
		}

		$licenseGroups = [];

		// Add the default label
		$licenseGroups[] = [
			'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-license-any' )->text(),
			'value' => ''
		];

		foreach ( array_keys( $licenseMappings ) as $group ) {
			$msgKey = 'wikibasemediainfo-special-mediasearch-filter-license-' . $group;

			$licenseGroups[] = [
				'label' => $this->context->msg( $msgKey )->text(),
				'value' => $group
			];
		}

		// Add the "other" label
		$licenseGroups[] = [
			'label' => $this->context->msg( 'wikibasemediainfo-special-mediasearch-filter-license-other' )->text(),
			'value' => 'other'
		];

		return $licenseGroups;
	}
}