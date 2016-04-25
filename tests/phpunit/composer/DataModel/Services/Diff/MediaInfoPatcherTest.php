<?php

namespace Wikibase\MediaInfo\Tests\DataModel\Services\Diff;

use Diff\DiffOp\Diff\Diff;
use Diff\DiffOp\DiffOpAdd;
use Diff\DiffOp\DiffOpChange;
use Diff\DiffOp\DiffOpRemove;
use InvalidArgumentException;
use PHPUnit_Framework_TestCase;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Services\Diff\EntityDiff;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoPatcher;

/**
 * @covers Wikibase\MediaInfo\DataModel\Services\Diff\MediaInfoPatcher
 *
 * @license GPL-2.0+
 * @author Jeroen De Dauw < jeroendedauw@gmail.com >
 * @author Thiemo Mättig
 */
class MediaInfoPatcherTest extends PHPUnit_Framework_TestCase {

	public function testGivenEmptyDiff_mediaInfoIsReturnedAsIs() {
		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'foo' );

		$patched = $mediaInfo->copy();
		$patcher = new MediaInfoPatcher();
		$patcher->patchEntity( $patched, new EntityDiff() );

		$this->assertInstanceOf( MediaInfo::class, $patched );
		$this->assertTrue( $mediaInfo->equals( $patched ) );
	}

	public function testCanPatchEntityType() {
		$patcher = new MediaInfoPatcher();
		$this->assertTrue( $patcher->canPatchEntityType( 'mediainfo' ) );
		$this->assertFalse( $patcher->canPatchEntityType( 'property' ) );
		$this->assertFalse( $patcher->canPatchEntityType( '' ) );
		$this->assertFalse( $patcher->canPatchEntityType( null ) );
	}

	public function testGivenNonMediaInfo_exceptionIsThrown() {
		$patcher = new MediaInfoPatcher();

		$this->setExpectedException( InvalidArgumentException::class );
		$patcher->patchEntity( new Item(), new EntityDiff() );
	}

	public function testLabelsArePatched() {
		$mediaInfo = new MediaInfo();
		$mediaInfo->getLabels()->setTextForLanguage( 'en', 'foo' );
		$mediaInfo->getLabels()->setTextForLanguage( 'de', 'bar' );

		$patch = new EntityDiff( [
			'label' => new Diff( [
				'en' => new DiffOpChange( 'foo', 'spam' ),
				'nl' => new DiffOpAdd( 'baz' ),
			] ),
		] );

		$patcher = new MediaInfoPatcher();
		$patcher->patchEntity( $mediaInfo, $patch );

		$this->assertSame( [
			'en' => 'spam',
			'de' => 'bar',
			'nl' => 'baz',
		], $mediaInfo->getLabels()->toTextArray() );
	}

	public function testStatementsArePatched() {
		$removedStatement = new Statement( new PropertyNoValueSnak( 1 ), null, null, 's1' );
		$addedStatement = new Statement( new PropertyNoValueSnak( 2 ), null, null, 's2' );

		$mediaInfo = new MediaInfo();
		$mediaInfo->getStatements()->addStatement( $removedStatement );

		$patch = new EntityDiff( [
			'claim' => new Diff( [
				's1' => new DiffOpRemove( $removedStatement ),
				's2' => new DiffOpAdd( $addedStatement ),
			] ),
		] );

		$expected = new MediaInfo();
		$expected->getStatements()->addStatement( $addedStatement );

		$patcher = new MediaInfoPatcher();
		$patcher->patchEntity( $mediaInfo, $patch );
		$this->assertEquals( $expected->getStatements(), $mediaInfo->getStatements() );
		$this->assertTrue( $expected->equals( $mediaInfo ) );
	}

}
