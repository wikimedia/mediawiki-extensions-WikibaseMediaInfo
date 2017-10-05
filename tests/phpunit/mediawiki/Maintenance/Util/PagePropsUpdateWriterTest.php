<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Maintenance\Util;

use IDatabase;
use MediaWikiTestCase;
use Wikibase\MediaInfo\Maintenance\Util\PagePropsUpdateWriter;

/**
 * @covers \Wikibase\MediaInfo\Maintenance\Util\PagePropsUpdateWriter
 * @group Database
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 */
class PagePropsUpdateWriterTest extends MediaWikiTestCase {

	public function provideWriteData() {
		return [
			[
				[
					[
						'primaryKey' => [ 'page_id' => '1' ],
						'changes' => [
							'pp_page' => '1',
							'pp_propname' => 'mediainfo_entity',
							'pp_value' => 'M1',
						],
					],
					[
						'primaryKey' => [ 'page_id' => '2' ],
						'changes' => [
							'pp_page' => '2',
							'pp_propname' => 'mediainfo_entity',
							'pp_value' => 'M2',
						],
					],
				],
				[
					[
						'pp_page' => '1',
						'pp_propname' => 'mediainfo_entity',
						'pp_value' => 'M1',
					],
					[
						'pp_page' => '2',
						'pp_propname' => 'mediainfo_entity',
						'pp_value' => 'M2',
					],
				],
			],
		];
	}

	/**
	 * @param array $updates
	 * @param array $expect
	 * @dataProvider provideWriteData
	 */
	public function testWrite( array $updates, array $expect ) {
		$db = $this->createMock( IDatabase::class );
		$db->expects( $this->once() )->method( 'insert' )->with( 'page_props', $expect )->willReturn( 1 );

		$writer = new PagePropsUpdateWriter( $db, 'page_props' );
		$writer->write( $updates );
	}

}
