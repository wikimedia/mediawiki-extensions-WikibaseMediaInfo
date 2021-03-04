<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Services;

use HashConfig;
use InvalidArgumentException;
use MediaWikiIntegrationTestCase;
use MockMessageLocalizer;
use Wikibase\MediaInfo\Services\MediaSearchOptions;

/**
 * @covers \Wikibase\MediaInfo\Services\MediaSearchOptions
 */
class MediaSearchOptionsTest extends MediaWikiIntegrationTestCase {
	public function assertIsValidConfigArray( array $data ) {
		$this->assertIsArray( $data );
		foreach ( $data as $entry ) {
			$this->assertArrayHasKey( 'label', $entry );
			$this->assertArrayHasKey( 'value', $entry );
		}
	}

	public function testGetImageSizesForValidTypes() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that all valid types have a valid sizes return value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$sizes = $options->getImageSizes( $type );
			$this->assertIsValidConfigArray( $sizes );
		}
	}

	public function testGetImageSizesForImage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that there are image sizes for image
		$sizes = $options->getImageSizes( MediaSearchOptions::TYPE_IMAGE );
		$this->assertNotEmpty( $sizes );
	}

	public function testGetImageSizesForPage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that there are no image sizes for page
		$sizes = $options->getImageSizes( MediaSearchOptions::TYPE_PAGE );
		$this->assertEmpty( $sizes );
	}

	public function testGetImageSizesForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getImageSizes( 'i-am-an-invalid-type' );
	}

	public function testGetMimeTypesForValidTypes() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that all valid types have a valid mime type return value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$mimes = $options->getMimeTypes( $type );
			$this->assertIsValidConfigArray( $mimes );
		}
	}

	public function testGetMimeTypesForImage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that there are mime types for image
		$mimes = $options->getMimeTypes( MediaSearchOptions::TYPE_IMAGE );
		$this->assertNotEmpty( $mimes );
	}

	public function testGetMimeTypesForPage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that there are no mime types for page
		$mimes = $options->getMimeTypes( MediaSearchOptions::TYPE_PAGE );
		$this->assertEmpty( $mimes );
	}

	public function testGetMimeTypesForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getMimeTypes( 'i-am-an-invalid-type' );
	}

	public function testGetSortsForValidTypes() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that all valid types have a valid sorts return value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$sorts = $options->getSorts( $type );
			$this->assertIsValidConfigArray( $sorts );
		}
	}

	public function testGetSortsForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getSorts( 'i-am-an-invalid-type' );
	}

	public function testGetLicenseGroupsForValidTypes() {
		$licenseMapping = [
			'attribution' => [ 'P275=Q98755364', 'P275=Q98755344' ],
			'attribution-same-license' => [ 'P275=Q19125117' ],
			'unrestricted' => [],
		];

		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig( [ 'LicenseMapping' => $licenseMapping ] )
		);

		// verify that all valid types have a valid licenses return value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$licenses = $options->getLicenseGroups( $type );
			$this->assertIsValidConfigArray( $licenses );

			if ( count( $licenses ) > 0 ) {
				// assert that the license map contains all configured licenses,
				// plus "" (= all) & "other"
				$expectedLicenses = array_merge(
					array_keys( $licenseMapping ),
					[ '', 'other' ]
				);
				$this->assertCount( count( $expectedLicenses ), $licenses );
				foreach ( $licenses as $license ) {
					$this->assertContains( $license['value'], $expectedLicenses );
				}
			}
		}
	}

	public function testGetLicenseGroupsForImage() {
		$licenseMapping = [
			'attribution' => [ 'P275=Q98755364', 'P275=Q98755344' ],
			'attribution-same-license' => [ 'P275=Q19125117' ],
			'unrestricted' => [],
		];

		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig( [ 'LicenseMapping' => $licenseMapping ] )
		);

		// verify that there are licenses for image
		$licenses = $options->getLicenseGroups( MediaSearchOptions::TYPE_IMAGE );
		$this->assertNotEmpty( $licenses );
	}

	public function testGetLicenseGroupsForPage() {
		$licenseMapping = [
			'attribution' => [ 'P275=Q98755364', 'P275=Q98755344' ],
			'attribution-same-license' => [ 'P275=Q19125117' ],
			'unrestricted' => [],
		];

		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig( [ 'LicenseMapping' => $licenseMapping ] )
		);

		// verify that there are no licenses for page
		$licenses = $options->getLicenseGroups( MediaSearchOptions::TYPE_PAGE );
		$this->assertEmpty( $licenses );
	}

	public function testGetLicenseGroupsForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getLicenseGroups( 'i-am-an-invalid-type' );
	}
}
