<?php

namespace Wikibase\MediaInfo\Tests\DataModel\Services\Diff;

use Diff\DiffOp\Diff\Diff;
use Diff\DiffOp\DiffOpAdd;
use Diff\DiffOp\DiffOpChange;
use PHPUnit_Framework_TestCase;
use Wikibase\DataModel\Services\Diff\EntityDiff;
use Wikibase\DataModel\Snak\PropertySomeValueSnak;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoDiffer;

/**
 * @covers Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoDiffer
 *
 * @license GPL-2.0+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 * @author Thiemo Mättig
 */
class MediaInfoDifferTest extends PHPUnit_Framework_TestCase {

	public function testGivenTwoEmptyMediaInfos_emptyMediaInfoDiffIsReturned() {
		$differ = new MediaInfoDiffer();

		$diff = $differ->diffEntities( new MediaInfo(), new MediaInfo() );

		$this->assertInstanceOf( EntityDiff::class, $diff );
		$this->assertTrue( $diff->isEmpty() );
	}

	public function testFingerprintIsDiffed() {
		$firstMediaInfo = new MediaInfo();
		$firstMediaInfo->getLabels()->setTextForLanguage( 'en', 'kittens' );

		$secondMediaInfo = new MediaInfo();
		$secondMediaInfo->getLabels()->setTextForLanguage( 'en', 'nyan' );
		$secondMediaInfo->getDescriptions()->setTextForLanguage( 'en', 'foo bar baz' );

		$differ = new MediaInfoDiffer();
		$diff = $differ->diffMediaInfos( $firstMediaInfo, $secondMediaInfo );

		$this->assertEquals(
			new Diff( [ 'en' => new DiffOpChange( 'kittens', 'nyan' ) ] ),
			$diff->getLabelsDiff()
		);

		$this->assertEquals(
			new Diff( [ 'en' => new DiffOpAdd( 'foo bar baz' ) ] ),
			$diff->getDescriptionsDiff()
		);
	}

	public function testClaimsAreDiffed() {
		$firstMediaInfo = new MediaInfo();

		$secondMediaInfo = new MediaInfo();
		$secondMediaInfo->getStatements()->addNewStatement(
			new PropertySomeValueSnak( 42 ),
			null,
			null,
			'guid'
		);

		$differ = new MediaInfoDiffer();
		$diff = $differ->diffMediaInfos( $firstMediaInfo, $secondMediaInfo );

		$this->assertCount( 1, $diff->getClaimsDiff()->getAdditions() );
	}

	public function testGivenEmptyMediaInfo_constructionDiffIsEmpty() {
		$differ = new MediaInfoDiffer();
		$this->assertTrue( $differ->getConstructionDiff( new MediaInfo() )->isEmpty() );
	}

	public function testGivenEmptyMediaInfo_destructionDiffIsEmpty() {
		$differ = new MediaInfoDiffer();
		$this->assertTrue( $differ->getDestructionDiff( new MediaInfo() )->isEmpty() );
	}

	public function testConstructionDiffContainsAddOperations() {
		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'foo' );

		$differ = new MediaInfoDiffer();
		$diff = $differ->getConstructionDiff( $mediaInfo );

		$this->assertEquals(
			new Diff( [ 'en' => new DiffOpAdd( 'foo' ) ] ),
			$diff->getLabelsDiff()
		);
	}

}
