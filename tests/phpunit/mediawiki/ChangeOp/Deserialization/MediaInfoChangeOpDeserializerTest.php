<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\ChangeOp\Deserialization;

use PHPUnit_Framework_MockObject_MockObject;
use Wikibase\ChangeOp\ChangeOpDescription;
use Wikibase\ChangeOp\ChangeOpLabel;
use Wikibase\ChangeOp\ChangeOpRemoveStatement;
use Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\ChangeOpDeserializationException;
use Wikibase\Repo\ChangeOp\Deserialization\ClaimsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\DescriptionsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\LabelsChangeOpDeserializer;
use Wikibase\Repo\Validators\TermValidatorFactory;

/**
 * @covers Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0+
 * @author Katie Filbert < aude.wiki@gmail.com >
 */
class MediaInfoChangeOpDeserializerTest extends \PHPUnit_Framework_TestCase {

	public function testCreateEntityChangeOp() {
		$changeRequest = [
			'labels' => [
				'en' => [ 'language' => 'en', 'value' => 'kitten' ],
			],
			'descriptions' => [
				'en' => [ 'language' => 'en', 'value' => 'young cat' ],
			],
			'claims' => [
				'P7' => [ [ 'remove' => '', 'id' => 'some-guid' ] ],
			],
		];

		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$this->getLabelsChangeOpDeserializerWithChangeRequest( $changeRequest ),
			$this->getDescriptionsChangeOpDeserializerWithChangeRequest( $changeRequest ),
			$this->getClaimsChangeOpDeserializerWithChangeRequest( $changeRequest )
		);

		$mediaInfoChangeOpDeserializer->createEntityChangeOp( $changeRequest );
	}

	public function testCreateEntityChangeOp_onlyLabelChange() {
		$changeRequest = [
			'labels' => [
				'en' => [ 'language' => 'en', 'value' => 'kitten' ],
			],
		];

		$descriptionsChangeOpDeserializer = $this->getDescriptionsChangeOpDeserializer();
		$descriptionsChangeOpDeserializer->expects( $this->never() )
			->method( 'createEntityChangeOp' );

		$claimsChangeOpDeserializer = $this->getClaimsChangeOpDeserializer();
		$claimsChangeOpDeserializer->expects( $this->never() )
			->method( 'createEntityChangeOp' );

		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$this->getLabelsChangeOpDeserializerWithChangeRequest( $changeRequest ),
			$descriptionsChangeOpDeserializer,
			$claimsChangeOpDeserializer
		);

		$mediaInfoChangeOpDeserializer->createEntityChangeOp( $changeRequest );
	}

	public function testCreateEntityChangeOp_onlyDescriptionChange() {
		$changeRequest = [
			'descriptions' => [
				'en' => [ 'language' => 'en', 'value' => 'young cat' ],
			],
		];

		$labelsChangeOpDeserializer = $this->getLabelsChangeOpDeserializer();
		$labelsChangeOpDeserializer->expects( $this->never() )
			->method( 'createEntityChangeOp' );

		$claimsChangeOpDeserializer = $this->getClaimsChangeOpDeserializer();
		$claimsChangeOpDeserializer->expects( $this->never() )
			->method( 'createEntityChangeOp' );

		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$labelsChangeOpDeserializer,
			$this->getDescriptionsChangeOpDeserializerWithChangeRequest( $changeRequest ),
			$claimsChangeOpDeserializer
		);

		$mediaInfoChangeOpDeserializer->createEntityChangeOp( $changeRequest );
	}

	public function testCreateEntityChangeOp_onlyClaimsChange() {
		$changeRequest = [
			'claims' => [
				'P7' => [ [ 'remove' => '', 'id' => 'some-guid' ] ],
			],
		];

		$labelsChangeOpDeserializer = $this->getLabelsChangeOpDeserializer();
		$labelsChangeOpDeserializer->expects( $this->never() )
			->method( 'createEntityChangeOp' );

		$descriptionsChangeOpDeserializer = $this->getDescriptionsChangeOpDeserializer();
		$descriptionsChangeOpDeserializer->expects( $this->never() )
			->method( 'createEntityChangeOp' );

		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$labelsChangeOpDeserializer,
			$descriptionsChangeOpDeserializer,
			$this->getClaimsChangeOpDeserializerWithChangeRequest( $changeRequest )
		);

		$mediaInfoChangeOpDeserializer->createEntityChangeOp( $changeRequest );
	}

	public function testCreateEntityChangeOp_withAliasesThrowsException() {
		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$this->getLabelsChangeOpDeserializer(),
			$this->getDescriptionsChangeOpDeserializer(),
			$this->getClaimsChangeOpDeserializer()
		);

		$this->setExpectedException( ChangeOpDeserializationException::class );
		$mediaInfoChangeOpDeserializer->createEntityChangeOp( [ 'aliases' => [] ] );
	}

	public function testCreateEntityChangeOp_withSiteLinksThrowsException() {
		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$this->getLabelsChangeOpDeserializer(),
			$this->getDescriptionsChangeOpDeserializer(),
			$this->getClaimsChangeOpDeserializer()
		);

		$this->setExpectedException( ChangeOpDeserializationException::class );
		$mediaInfoChangeOpDeserializer->createEntityChangeOp( [ 'sitelinks' => [] ] );
	}

	/**
	 * @return LabelsChangeOpDeserializer|PHPUnit_Framework_MockObject_MockObject
	 */
	private function getLabelsChangeOpDeserializer() {
		return $this->getMockBuilder( LabelsChangeOpDeserializer::class )
			->disableOriginalConstructor()
			->getMock();
	}

	/**
	 * @param array[] $changeRequest
	 *
	 * @return LabelsChangeOpDeserializer
	 */
	private function getLabelsChangeOpDeserializerWithChangeRequest( array $changeRequest ) {
		$changeOpDeserializer = $this->getLabelsChangeOpDeserializer();
		$changeOpDeserializer->expects( $this->once() )
			->method( 'createEntityChangeOp' )
			->with( $changeRequest )
			->willReturn( new ChangeOpLabel(
				'en',
				'kitten',
				$this->getTermValidatorFactory()
			) );

		return $changeOpDeserializer;
	}

	/**
	 * @return DescriptionsChangeOpDeserializer|PHPUnit_Framework_MockObject_MockObject
	 */
	private function getDescriptionsChangeOpDeserializer() {
		return $this->getMockBuilder( DescriptionsChangeOpDeserializer::class )
			->disableOriginalConstructor()
			->getMock();
	}

	/**
	 * @param array[] $changeRequest
	 *
	 * @return DescriptionsChangeOpDeserializer
	 */
	private function getDescriptionsChangeOpDeserializerWithChangeRequest( array $changeRequest ) {
		$changeOpDeserializer = $this->getDescriptionsChangeOpDeserializer();
		$changeOpDeserializer->expects( $this->once() )
			->method( 'createEntityChangeOp' )
			->with( $changeRequest )
			->willReturn( new ChangeOpDescription(
				'en',
				'young cat',
				$this->getTermValidatorFactory()
			) );

		return $changeOpDeserializer;
	}

	/**
	 * @return ClaimsChangeOpDeserializer|PHPUnit_Framework_MockObject_MockObject
	 */
	private function getClaimsChangeOpDeserializer() {
		return $this->getMockBuilder( ClaimsChangeOpDeserializer::class )
			->disableOriginalConstructor()
			->getMock();
	}

	/**
	 * @param array[] $changeRequest
	 *
	 * @return ClaimsChangeOpDeserializer
	 */
	private function getClaimsChangeOpDeserializerWithChangeRequest( array $changeRequest ) {
		$changeOpDeserializer = $this->getClaimsChangeOpDeserializer();
		$changeOpDeserializer->expects( $this->once() )
			->method( 'createEntityChangeOp' )
			->with( $changeRequest )
			->willReturn( new ChangeOpRemoveStatement( 'some-guid' ) );

		return $changeOpDeserializer;
	}

	/**
	 * @return TermValidatorFactory
	 */
	private function getTermValidatorFactory() {
		return $this->getMockBuilder( TermValidatorFactory::class )
			->disableOriginalConstructor()
			->getMock();
	}

}
