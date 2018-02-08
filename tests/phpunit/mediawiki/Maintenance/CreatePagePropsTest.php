<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Maintenance;

use MediaWikiTestCase;
use Wikibase\MediaInfo\Maintenance\CreatePageProps;

/**
 * @covers \Wikibase\MediaInfo\Maintenance\CreatePageProps
 * @group Database
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 */
class CreatePagePropsTest extends MediaWikiTestCase {

	public function setUp() {
		parent::setUp();

		$this->tablesUsed[] = 'page';
		$this->tablesUsed[] = 'page_props';
	}

	public function provideDBUpdatesData() {
		$pageId1 = $this->newPageId();
		$pageId2 = $this->newPageId();

		return [
			[
				// 2 file page entries, none of which have mediainfo page_prop already
				[
					// page
					[
						'page_id' => $pageId1,
						'page_namespace' => NS_FILE,
						'page_title' => 'File.jpg',
					] + $this->newPageRow(),
					[
						'page_id' => $pageId2,
						'page_namespace' => NS_FILE,
						'page_title' => 'File2.jpg',
					] + $this->newPageRow(),
				],
				[
					// page_props
				],
			],
			[
				// 2 file page entries, both of which have mediainfo page_prop already
				[
					// page
					[
						'page_id' => $pageId1,
						'page_namespace' => NS_FILE,
						'page_title' => 'File.jpg',
					] + $this->newPageRow(),
					[
						'page_id' => $pageId2,
						'page_namespace' => NS_FILE,
						'page_title' => 'File2.jpg',
					] + $this->newPageRow(),
				],
				[
					// page_props
					[
						'pp_page' => $pageId1,
						'pp_propname' => 'mediainfo_entity',
						'pp_value' => 'M'.$pageId1,
						'pp_sortkey' => null,
					],
					[
						'pp_page' => $pageId2,
						'pp_propname' => 'mediainfo_entity',
						'pp_value' => 'M'.$pageId2,
						'pp_sortkey' => null,
					]
				],
			],
			[
				// 2 file page entries, one of which has mediainfo page_prop already
				[
					// page
					[
						'page_id' => $pageId1,
						'page_namespace' => NS_FILE,
						'page_title' => 'File.jpg',
					] + $this->newPageRow(),
					[
						'page_id' => $pageId2,
						'page_namespace' => NS_FILE,
						'page_title' => 'File2.jpg',
					] + $this->newPageRow(),
				],
				[
					// page_props
					[
						'pp_page' => $pageId1,
						'pp_propname' => 'mediainfo_entity',
						'pp_value' => 'M'.$pageId1,
						'pp_sortkey' => null,
					]
				],
			],
		];
	}

	/**
	 * @param array $page
	 * @param array $props
	 * @dataProvider provideDBUpdatesData
	 */
	public function testDBUpdates( $page, $props ) {
		$db = wfGetDB( DB_MASTER );
		$db->insert( 'page', $page );
		$db->insert( 'page_props', $props );

		$update = new CreatePageProps();
		$update->doDBUpdates();

		// an inner join on page & page_props should suffice to test if the page_props got created
		// correctly: there should be exactly the same amount of mediainfo page_props as there are
		// page entries here...
		$rows = $db->select(
			[ 'page', 'page_props' ],
			'*',
			[ 'page_namespace' => NS_FILE, ],
			__METHOD__,
			[],
			[
				'page_props' => [
					'INNER JOIN',
					[
						'pp_page = page_id',
						'pp_propname' => 'mediainfo_entity',
					],
				]
			]
		);
		$this->assertCount( count( $page ), $rows );
	}

	/**
	 * Generate a new page_id, one that does not yet exist.
	 *
	 * @return int
	 */
	protected function newPageId() {
		static $pageId;
		if ( $pageId === null ) {
			$db = wfGetDB( DB_REPLICA );
			$pageId = (int)$db->selectField( 'page', 'MAX(page_id) + 1' );
		} else {
			$pageId++;
		}

		return $pageId;
	}

	/**
	 * Generate a row for `page` table.
	 *
	 * @return array
	 */
	protected function newPageRow() {

		return [
			// page
			'page_id' => $this->newPageId(),
			'page_namespace' => NS_FILE,
			'page_title' => 'File.jpg',
			'page_restrictions' => '',
			'page_is_redirect' => 0,
			'page_is_new' => 1,
			'page_random' => 0,
			'page_touched' => wfTimestamp( TS_MW ),
			'page_links_updated' => wfTimestamp( TS_MW ),
			'page_latest' => 0,
			'page_len' => 213,
			'page_content_model' => 'wikitext',
			'page_lang' => null,
		];
	}

}
