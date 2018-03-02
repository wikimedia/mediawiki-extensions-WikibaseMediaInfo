<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Maintenance\Util;

use MediaWikiTestCase;
use stdClass;
use Wikibase\MediaInfo\Maintenance\Util\PagePropsUpdateGenerator;
use Wikibase\Repo\WikibaseRepo;

/**
 * @covers \Wikibase\MediaInfo\Maintenance\Util\PagePropsUpdateGenerator
 * @group Database
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class PagePropsUpdateGeneratorTest extends MediaWikiTestCase {

	public function provideUpdateData() {
		return [
			[
				(object)[ 'page_id' => '1' ],
				[
					'pp_page' => '1',
					'pp_propname' => 'mediainfo_entity',
					'pp_value' => 'M1',
				],
			],
			[
				(object)[ 'page_id' => '2' ],
				[
					'pp_page' => '2',
					'pp_propname' => 'mediainfo_entity',
					'pp_value' => 'M2',
				],
			],
		];
	}

	/**
	 * @param stdClass $row
	 * @param array $expect
	 * @dataProvider provideUpdateData
	 */
	public function testUpdate( stdClass $row, array $expect ) {
		$entityIdComposer = WikibaseRepo::getDefaultInstance()->getEntityIdComposer();
		$generator = new PagePropsUpdateGenerator( $entityIdComposer );
		$result = $generator->update( $row );
		$this->assertArrayEquals( $expect, $result );
	}

}
