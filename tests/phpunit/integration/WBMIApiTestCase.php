<?php

namespace Wikibase\MediaInfo\Tests\Integration;

use MockSearchEngine;
use TestUser;

/**
 * Base class for test classes
 */
abstract class WBMIApiTestCase extends \ApiUploadTestCase {

	private function setupWbEditorUser() {
		self::$users['wbeditor'] = new TestUser(
			'Apitesteditor',
			'Api Test Editor',
			'api_test_editor@example.com',
			[ 'wbeditor' ]
		);
	}

	private function setupSearchEngine() {
		MockSearchEngine::clearMockResults();
		$this->setMwGlobals( [
			'wgSearchType' => MockSearchEngine::class,
		] );
	}

	protected function setUp(): void {
		parent::setUp();

		$this->setupWbEditorUser();
		$this->setupSearchEngine();
	}

	private function login() {
		$user = self::$users['uploader'];
		$userName = $user->getUser()->getName();
		$password = $user->getPassword();

		$params = [
			'action' => 'login',
			'lgname' => $userName,
			'lgpassword' => $password
		];
		list( , , $session ) = $this->doApiRequest( $params );
		return $session;
	}

	protected function uploadRandomImage() {
		$session = $this->login();
		$extension = 'png';
		$mimeType = 'image/png';

		try {
			$randomImageGenerator = new \RandomImageGenerator();
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

		list( $result, , ) = $this->doApiRequestWithToken(
			$params,
			$session,
			self::$users['uploader']->getUser()
		);

		$this->assertArrayHasKey( 'upload', $result, "Bad response: " . json_encode( $result ) );
		$this->assertArrayHasKey( 'imageinfo', $result['upload'],
			"Bad response: " . json_encode( $result ) );
		$this->assertArrayHasKey( 'canonicaltitle', $result['upload']['imageinfo'],
			"Bad response: " . json_encode( $result ) );
		return $result['upload']['imageinfo']['canonicaltitle'];
	}

}
