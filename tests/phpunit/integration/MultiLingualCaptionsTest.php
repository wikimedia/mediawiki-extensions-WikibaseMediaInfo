<?php

namespace Wikibase\MediaInfo\Tests\Integration;

use ApiUsageException;
use MockSearchEngine;
use TestUser;
use User;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\WikibaseRepo;

/**
 * A basic integration test that makes sure the API works for basic multi-lingual captions
 * functionality
 *
 * What's tested:
 * - add a caption
 * - edit a caption
 * - delete a caption
 * - get all data for an entity
 * - search (just that the search works without falling over, results are not tested)
 *
 * @group medium
 * @group upload
 * @group database
 * @coversNothing
 */
class MultiLingualCaptionsTest extends \ApiUploadTestCase {

	protected function setUp() {
		parent::setUp();

		$this->setupWbEditorUser();
		$this->setupSearchEngine();
	}

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

	/**
	 * Appends an edit token to a request.
	 *
	 * @param array $params
	 * @param array|null $session
	 * @param User|null $user
	 * @param string $tokenType
	 *
	 * @throws ApiUsageException
	 * @return array( array|null $resultData, WebRequest $request, array $sessionArray )
	 */
	protected function doApiRequestWithToken(
		array $params,
		array $session = null,
		User $user = null,
		$tokenType = 'csrf'
	) {
		if ( !$user ) {
			$user = $GLOBALS['wgUser'];
		}

		if ( !array_key_exists( 'token', $params ) ) {
			$params['token'] = $user->getEditToken();
		}

		return $this->doApiRequest( $params, $session, false, $user, $tokenType );
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

	private function upload() {
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

		return $result['upload']['imageinfo']['canonicaltitle'];
	}

	public function testEditCaptions() {
		$testFilePage = \WikiPage::factory(
			\Title::newFromText( $this->upload() )
		);

		$pageId = $testFilePage->getId();
		$entityIdComposer = WikibaseRepo::getDefaultInstance()->getEntityIdComposer();
		$entityId = $entityIdComposer->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		)->getSerialization();

		// Add a caption (first caption has to be added without the revision id)
		$this->doApiRequestWithToken(
			[
				'action' =>	'wbsetlabel',
				'id' =>	$entityId,
				'language' => 'en',
				'value' => 'TEST_ENGLISH_CAPTION',
				'bot' => 1,
			],
			null,
			self::$users['wbeditor']->getUser()
		);

		// Add a 2nd caption
		list( $result, , ) = $this->doApiRequestWithToken(
			[
				'action' =>	'wbsetlabel',
				'id' =>	$entityId,
				'language' => 'fr',
				'value' => 'TEST_FRENCH_CAPTION',
				'bot' => 1,
			],
			null,
			self::$users['wbeditor']->getUser()
		);

		// Get the entity from the API
		list( $result, , ) = $this->doApiRequestWithToken(
			[
				'action' =>	'wbgetentities',
				'ids' =>	$entityId,
				'props' => 'info|labels'
			],
			null,
			self::$users['wbeditor']->getUser()
		);
		$captions = $result['entities'][$entityId]['labels'];

		$this->assertEquals( 'TEST_ENGLISH_CAPTION', $captions['en']['value'] );
		$this->assertEquals( 'TEST_FRENCH_CAPTION', $captions['fr']['value'] );

		// Delete English caption
		$this->doApiRequestWithToken(
			[
				'action' =>	'wbsetlabel',
				'id' =>	$entityId,
				'language' => 'en',
				'value' => '',
				'bot' => 1,
			],
			null,
			self::$users['wbeditor']->getUser()
		);

		// Edit French caption
		list( $result, , ) = $this->doApiRequestWithToken(
			[
				'action' =>	'wbsetlabel',
				'id' =>	$entityId,
				'language' => 'fr',
				'value' => 'TEST_FRENCH_CAPTION_EDITED',
				'bot' => 1,
			],
			null,
			self::$users['wbeditor']->getUser()
		);

		// Get the entity from the API
		list( $result, , ) = $this->doApiRequestWithToken(
			[
				'action' =>	'wbgetentities',
				'ids' =>	$entityId,
				'props' => 'info|labels'
			],
			null,
			self::$users['wbeditor']->getUser()
		);
		$captions = $result['entities'][$entityId]['labels'];

		$this->assertArrayNotHasKey( 'en', $captions );
		$this->assertEquals( 'TEST_FRENCH_CAPTION_EDITED', $captions['fr']['value'] );

		// Search for the captions
		// NOTE: we don't expect this to return results, as caption search depends on a Cirrus job.
		// Just do an API call to make sure that there isn't a fatal
		$this->doApiRequestWithToken(
			[
				'action' =>	'query',
				'list' => 'search',
				'srsearch' => 'TEST_FRENCH_CAPTION_EDITED'
			],
			null,
			self::$users['wbeditor']->getUser()
		);
	}

}
