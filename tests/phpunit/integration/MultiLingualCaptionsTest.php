<?php

namespace Wikibase\MediaInfo\Tests\Integration;

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
 * @group Database
 * @coversNothing
 */
class MultiLingualCaptionsTest extends WBMIApiTestCase {

	public function testEditCaptions() {
		$testFilePage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle(
			\Title::newFromText( $this->uploadRandomImage() )
		);

		$pageId = $testFilePage->getId();
		$entityIdComposer = WikibaseRepo::getEntityIdComposer();
		$entityId = $entityIdComposer->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		)->getSerialization();

		// Add a caption (first caption has to be added without the revision id)
		$this->doApiRequestWithToken(
			[
				'action' => 'wbsetlabel',
				'id' => $entityId,
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
				'action' => 'wbsetlabel',
				'id' => $entityId,
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
				'action' => 'wbgetentities',
				'ids' => $entityId,
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
				'action' => 'wbsetlabel',
				'id' => $entityId,
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
				'action' => 'wbsetlabel',
				'id' => $entityId,
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
				'action' => 'wbgetentities',
				'ids' => $entityId,
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
				'action' => 'query',
				'list' => 'search',
				'srsearch' => 'TEST_FRENCH_CAPTION_EDITED'
			],
			null,
			self::$users['wbeditor']->getUser()
		);
	}

}
