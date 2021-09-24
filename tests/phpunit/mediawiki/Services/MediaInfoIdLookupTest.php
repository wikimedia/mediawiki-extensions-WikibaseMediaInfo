<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Services;

use Title;
use Wikibase\DataModel\Entity\SerializableEntityId;
use Wikibase\DataModel\Services\EntityId\EntityIdComposer;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\MediaInfoIdLookup;

/**
 * @covers \Wikibase\MediaInfo\Services\MediaInfoIdLookup
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Daniel Kinzler
 */
class MediaInfoIdLookupTest extends \PHPUnit\Framework\TestCase {

	private function getEntityIdComposer() {
		return new EntityIdComposer( [
			'mediainfo' => static function ( $repositoryName, $uniquePart ) {
				return new MediaInfoId( SerializableEntityId::joinSerialization( [
					$repositoryName,
					'',
					'M' . $uniquePart
				] ) );
			},
		] );
	}

	public function provideGetEntityIdForTitle() {
		$title = Title::makeTitle( NS_FILE, 'File:Test.jpg' );
		$title->resetArticleID( 13 );

		return [
			[ $title, 'M13' ]
		];
	}

	/**
	 * @dataProvider provideGetEntityIdForTitle
	 */
	public function testGetEntityIdForTitle( Title $title, $expected ) {
		$entityIdComposer = $this->getEntityIdComposer();
		$lookup = new MediaInfoIdLookup( $entityIdComposer, NS_FILE );

		$entityId = $lookup->getEntityIdForTitle( $title );

		$this->assertInstanceOf( MediaInfoId::class, $entityId );
		$this->assertEquals( $expected, $entityId->getSerialization() );
	}

	public function provideGetEntityIdForTitle_fail() {
		$badNamespaceTitle = Title::makeTitle( NS_MAIN, 'File:Test.jpg' );
		$badNamespaceTitle->resetArticleID( 13 );

		return [
			'bad namespace' => [ $badNamespaceTitle ],
		];
	}

	/**
	 * @dataProvider provideGetEntityIdForTitle_fail
	 */
	public function testGetEntityIdForTitle_fail( Title $title ) {
		$entityIdComposer = $this->getEntityIdComposer();
		$lookup = new MediaInfoIdLookup( $entityIdComposer, NS_FILE );

		$entityId = $lookup->getEntityIdForTitle( $title );

		$this->assertNull( $entityId );
	}

}
