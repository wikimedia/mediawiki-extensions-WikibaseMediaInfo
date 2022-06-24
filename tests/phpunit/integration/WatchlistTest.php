<?php

namespace Wikibase\MediaInfo\Tests\Integration;

use MediaWiki\MediaWikiServices;
use Title;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\WikibaseRepo;

/**
 * What's tested:
 * - set watch settings to watch created, but not edited pages
 * - upload a file (as a different user that is not used again)
 * - add a caption to it, this creates a new entity but should not watch the page
 * - change watch settings to watch edited pages too
 * - add another caption to it, this should now watch the page
 *
 * @group medium
 * @group upload
 * @group Database
 * @coversNothing
 */
class WatchlistTest extends WBMIApiTestCase {

	private $editor;

	protected function setUp(): void {
		parent::setUp();
		$this->editor = self::$users['wbeditor']->getUser();
	}

	private function addCaption( string $entityId, string $language, string $caption ) {
		$this->doApiRequestWithToken(
			[
				'action' => 'wbsetlabel',
				'id' => $entityId,
				'language' => $language,
				'value' => $caption,
				'bot' => 1,
			],
			null,
			$this->editor
		);
	}

	public function testWatchlist() {
		$userOptionsManager = MediaWikiServices::getInstance()->getUserOptionsManager();
		$userOptionsManager->setOption( $this->editor, 'watchdefault', 0 );
		$userOptionsManager->setOption( $this->editor, 'watchcreations', 1 );

		$testFileTitle = Title::newFromText( $this->uploadRandomImage() );
		$testFilePage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $testFileTitle );

		$pageId = $testFilePage->getId();
		$entityIdComposer = WikibaseRepo::getEntityIdComposer();
		$entityId = $entityIdComposer->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		)->getSerialization();

		$watchlistManager = $this->getServiceContainer()->getWatchlistManager();

		$this->addCaption( $entityId, 'en', 'a caption' );
		$this->assertFalse(
			$watchlistManager->isWatched( $this->editor, $testFileTitle ),
			'page should not be watched because no new page was created'
		);

		$userOptionsManager->setOption( $this->editor, 'watchdefault', 1 );
		$this->addCaption( $entityId, 'de', 'eine Kurzbeschreibung' );
		$this->assertTrue(
			$watchlistManager->isWatched( $this->editor, $testFileTitle ),
			'page should be watched because an edit was made'
		);
	}

}
