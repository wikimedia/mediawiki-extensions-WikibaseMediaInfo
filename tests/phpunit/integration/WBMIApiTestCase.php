<?php

namespace Wikibase\MediaInfo\Tests\Integration;

use MediaWiki\MainConfigNames;
use MediaWiki\Tests\Api\ApiUploadTestCase;
use MediaWiki\Tests\Api\RandomImageGenerator;
use MockSearchEngine;

/**
 * Base class for test classes
 */
abstract class WBMIApiTestCase extends ApiUploadTestCase {

	private function setupSearchEngine() {
		MockSearchEngine::clearMockResults();
		$this->overrideConfigValues( [
			MainConfigNames::FileExtensions => [ 'svg' ],
			MainConfigNames::SearchType => MockSearchEngine::class,
		] );
	}

	protected function setUp(): void {
		parent::setUp();

		$this->setupSearchEngine();
	}

	protected function uploadRandomImage() {
		try {
			$filePaths = ( new RandomImageGenerator() )->writeImages(
				1,
				'svg',
				$this->getNewTempDirectory()
			);
		} catch ( \Exception $e ) {
			$this->markTestIncomplete( $e->getMessage() );
		}

		$filePath = $filePaths[0];
		$fileName = basename( $filePath );

		if ( !$this->fakeUploadFile( 'file', $fileName, 'image/svg', $filePath ) ) {
			$this->markTestIncomplete( "Couldn't upload file!\n" );
		}

		$params = [
			'action' => 'upload',
			'filename' => $fileName,
			'file' => file_get_contents( $filePath ),
			'comment' => 'dummy comment',
			'text' => "This is the page text for $fileName",
		];

		[ $result, , ] = $this->doApiRequestWithToken(
			$params,
			null,
			$this->getTestUser()->getUser()
		);

		$this->assertArrayHasKey( 'upload', $result, "Bad response: " . json_encode( $result ) );
		$this->assertArrayHasKey( 'imageinfo', $result['upload'],
			"Bad response: " . json_encode( $result ) );
		$this->assertArrayHasKey( 'canonicaltitle', $result['upload']['imageinfo'],
			"Bad response: " . json_encode( $result ) );
		return $result['upload']['imageinfo']['canonicaltitle'];
	}

}
