<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\ChangeOp\Deserialization;

use PHPUnit\Framework\MockObject\MockObject;
use Wikibase\Repo\ChangeOp\ChangeOpDescription;
use Wikibase\Repo\ChangeOp\ChangeOpLabel;
use Wikibase\Repo\ChangeOp\ChangeOpRemoveStatement;
use Wikibase\Repo\ChangeOp\FingerprintChangeOpFactory;
use Wikibase\Lib\StaticContentLanguages;
use Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\ChangeOp\Deserialization\ChangeOpDeserializationException;
use Wikibase\Repo\ChangeOp\Deserialization\ClaimsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\DescriptionsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\LabelsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\TermChangeOpSerializationValidator;
use Wikibase\Repo\Tests\ChangeOp\ChangeOpTestMockProvider;
use Wikibase\Repo\Tests\ChangeOp\Deserialization\DescriptionsChangeOpDeserializationTester;
use Wikibase\Repo\Tests\ChangeOp\Deserialization\LabelsChangeOpDeserializationTester;
use Wikibase\Repo\Validators\TermValidatorFactory;
use Wikibase\StringNormalizer;

/**
 * @covers Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Katie Filbert < aude.wiki@gmail.com >
 */
class MediaInfoChangeOpDeserializerTest extends \PHPUnit\Framework\TestCase {

	use LabelsChangeOpDeserializationTester;
	use DescriptionsChangeOpDeserializationTester;

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

		$this->expectException( ChangeOpDeserializationException::class );
		$mediaInfoChangeOpDeserializer->createEntityChangeOp( [ 'aliases' => [] ] );
	}

	public function testCreateEntityChangeOp_withSiteLinksThrowsException() {
		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$this->getLabelsChangeOpDeserializer(),
			$this->getDescriptionsChangeOpDeserializer(),
			$this->getClaimsChangeOpDeserializer()
		);

		$this->expectException( ChangeOpDeserializationException::class );
		$mediaInfoChangeOpDeserializer->createEntityChangeOp( [ 'sitelinks' => [] ] );
	}

	/**
	 * @return LabelsChangeOpDeserializer|MockObject
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
	 * @return DescriptionsChangeOpDeserializer|MockObject
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
	 * @return ClaimsChangeOpDeserializer|MockObject
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

	/**
	 * @return MediaInfoChangeOpDeserializer
	 */
	public function getChangeOpDeserializer() {
		$mockProvider = new ChangeOpTestMockProvider( $this );

		return new MediaInfoChangeOpDeserializer(
			new LabelsChangeOpDeserializer(
				new FingerprintChangeOpFactory( $mockProvider->getMockTermValidatorFactory() ),
				new StringNormalizer(),
				new TermChangeOpSerializationValidator( new StaticContentLanguages( [ 'en' ] ) )
			),
			new DescriptionsChangeOpDeserializer(
				new FingerprintChangeOpFactory( $mockProvider->getMockTermValidatorFactory() ),
				new StringNormalizer(),
				new TermChangeOpSerializationValidator( new StaticContentLanguages( [ 'en' ] ) )
			),
			$this->getClaimsChangeOpDeserializer()
		);
	}

	/**
	 * @return MediaInfo
	 */
	public function getEntity() {
		return new MediaInfo();
	}

}
