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

		if ( isset( $data['items'] ) ) {
			foreach ( $data['items'] as $entry ) {
				$this->assertArrayHasKey( 'label', $entry );
				$this->assertArrayHasKey( 'value', $entry );
			}
		}
	}

	public function testGetImageSizesForValidTypes() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_SIZE ],
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
			[ MediaSearchOptions::FILTER_SIZE ],
			new HashConfig()
		);

		// verify that there are image sizes for image
		$sizes = $options->getImageSizes( MediaSearchOptions::TYPE_IMAGE );
		$this->assertNotEmpty( $sizes );
	}

	public function testGetImageSizesForPage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_SIZE ],
			new HashConfig()
		);

		// verify that there are no image sizes for page
		$sizes = $options->getImageSizes( MediaSearchOptions::TYPE_PAGE );
		$this->assertEmpty( $sizes );
	}

	public function testGetImageSizesNotEnabled() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[],
			new HashConfig()
		);

		// verify that none of the valid types return a value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$sizes = $options->getSorts( $type );
			$this->assertEmpty( $sizes );
		}
	}

	public function testGetImageSizesForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_SIZE ],
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getImageSizes( 'i-am-an-invalid-type' );
	}

	public function testGetMimeTypesForValidTypes() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_MIME ],
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
			[ MediaSearchOptions::FILTER_MIME ],
			new HashConfig()
		);

		// verify that there are mime types for image
		$mimes = $options->getMimeTypes( MediaSearchOptions::TYPE_IMAGE );
		$this->assertNotEmpty( $mimes );
	}

	public function testGetMimeTypesForPage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_MIME ],
			new HashConfig()
		);

		// verify that there are no mime types for page
		$mimes = $options->getMimeTypes( MediaSearchOptions::TYPE_PAGE );
		$this->assertEmpty( $mimes );
	}

	public function testGetMimeTypesNotEnabled() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_MIME ],
			new HashConfig()
		);

		// verify that none of the valid types return a value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$mimes = $options->getSorts( $type );
			$this->assertEmpty( $mimes );
		}
	}

	public function testGetMimeTypesForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_MIME ],
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getMimeTypes( 'i-am-an-invalid-type' );
	}

	public function testGetSortsForValidTypes() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_SORT ],
			new HashConfig()
		);

		// verify that all valid types have a valid sorts return value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$sorts = $options->getSorts( $type );
			$this->assertIsValidConfigArray( $sorts );
		}
	}

	public function testGetSortsNotEnabled() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[],
			new HashConfig()
		);

		// verify that none of the valid types return a value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$sorts = $options->getSorts( $type );
			$this->assertEmpty( $sorts );
		}
	}

	public function testGetSortsForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_SORT ],
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
			[ MediaSearchOptions::FILTER_LICENSE ],
			new HashConfig( [ 'LicenseMapping' => $licenseMapping ] )
		);

		// verify that all valid types have a valid licenses return value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$licenses = $options->getLicenseGroups( $type );
			$this->assertIsValidConfigArray( $licenses );

			if ( isset( $licenses['items'] ) && count( $licenses['items'] ) > 0 ) {
				// assert that the license map contains all configured licenses,
				// plus "" (= all) & "other"
				$expectedLicenses = array_merge(
					array_keys( $licenseMapping ),
					[ '', 'other' ]
				);
				$this->assertCount( count( $expectedLicenses ), $licenses['items'] );
				foreach ( $licenses['items'] as $license ) {
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
			[ MediaSearchOptions::FILTER_LICENSE ],
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
			[ MediaSearchOptions::FILTER_LICENSE ],
			new HashConfig( [ 'LicenseMapping' => $licenseMapping ] )
		);

		// verify that there are no licenses for page
		$licenses = $options->getLicenseGroups( MediaSearchOptions::TYPE_PAGE );
		$this->assertEmpty( $licenses );
	}

	public function testGetLicenseGroupsNotEnabled() {
		$licenseMapping = [
			'attribution' => [ 'P275=Q98755364', 'P275=Q98755344' ],
			'attribution-same-license' => [ 'P275=Q19125117' ],
			'unrestricted' => [],
		];

		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[],
			new HashConfig( [ 'LicenseMapping' => $licenseMapping ] )
		);

		// verify that none of the valid types return a value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$licenses = $options->getSorts( $type );
			$this->assertEmpty( $licenses );
		}
	}

	public function testGetLicenseGroupsForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_LICENSE ],
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getLicenseGroups( 'i-am-an-invalid-type' );
	}

	public function testGetNamespacesForValidTypes() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_NAMESPACE ],
			new HashConfig()
		);

		// verify that all valid types have a valid namespace return value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$namespaceData = $options->getNamespaces( $type );
			$this->assertIsValidConfigArray( $namespaceData );
		}
	}

	public function testGetNamespacesForImage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_NAMESPACE ],
			new HashConfig()
		);

		// verify that there are no namespaces for image
		$namespaceData = $options->getNamespaces( MediaSearchOptions::TYPE_IMAGE );
		$this->assertEmpty( $namespaceData );
	}

	public function testGetNamespacesForPage() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_NAMESPACE ],
			new HashConfig()
		);

		// verify that there are namespaces for page
		$namespaceData = $options->getNamespaces( MediaSearchOptions::TYPE_PAGE );

		$this->assertNotEmpty( $namespaceData );

		// verify that there is extra data for this filter
		$this->assertNotEmpty( $namespaceData['data'] );
	}

	public function testGetNamespacesNotEnabled() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_NAMESPACE ],
			new HashConfig()
		);

		// verify that none of the valid types return a value
		foreach ( MediaSearchOptions::ALL_TYPES as $type ) {
			$namespaceData = $options->getSorts( $type );
			$this->assertEmpty( $namespaceData );
		}
	}

	public function testGetNamespacesForInvalidTypesThrows() {
		$options = new MediaSearchOptions(
			new MockMessageLocalizer(),
			[ MediaSearchOptions::FILTER_NAMESPACE ],
			new HashConfig()
		);

		// verify that invalid types throw an exception
		$this->expectException( InvalidArgumentException::class );
		$options->getNamespaces( 'i-am-an-invalid-type' );
	}
}
