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
			MainConfigNames::SearchType => MockSearchEngine::class,
		] );
	}

	protected function setUp(): void {
		parent::setUp();

		$this->setupSearchEngine();
	}

	private function login() {
		$user = $this->getTestUser();
		$userName = $user->getUser()->getName();
		$password = $user->getPassword();

		$params = [
			'action' => 'login',
			'lgname' => $userName,
			'lgpassword' => $password
		];
		[ , , $session ] = $this->doApiRequest( $params );
		return $session;
	}

	protected function uploadRandomImage() {
		$session = $this->login();
		$extension = 'png';
		$mimeType = 'image/png';

		try {
			$randomImageGenerator = new RandomImageGenerator();
			$filePaths = $randomImageGenerator->writeImages(
				1,
				$extension,
				$this->getNewTempDirectory()
			);
		} catch ( \Exception $e ) {
			$this->markTestIncomplete( $e->getMessage() );
		}

		/** @var array $filePaths */
		$filePath = $filePaths[0];
		$fileName = basename( $filePath );

		if ( !$this->fakeUploadFile( 'file', $fileName, $mimeType, $filePath ) ) {
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
			$session,
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
