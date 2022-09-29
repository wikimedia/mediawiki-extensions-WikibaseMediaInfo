<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\ChangeOp\Deserialization;

use Wikibase\Lib\StaticContentLanguages;
use Wikibase\Lib\StringNormalizer;
use Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\ChangeOp\ChangeOpDescription;
use Wikibase\Repo\ChangeOp\ChangeOpLabel;
use Wikibase\Repo\ChangeOp\ChangeOpRemoveStatement;
use Wikibase\Repo\ChangeOp\Deserialization\ChangeOpDeserializationException;
use Wikibase\Repo\ChangeOp\Deserialization\ClaimsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\DescriptionsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\LabelsChangeOpDeserializer;
use Wikibase\Repo\ChangeOp\Deserialization\TermChangeOpSerializationValidator;
use Wikibase\Repo\ChangeOp\FingerprintChangeOpFactory;
use Wikibase\Repo\Tests\ChangeOp\ChangeOpTestMockProvider;
use Wikibase\Repo\Tests\ChangeOp\Deserialization\DescriptionsChangeOpDeserializationTester;
use Wikibase\Repo\Tests\ChangeOp\Deserialization\LabelsChangeOpDeserializationTester;
use Wikibase\Repo\Validators\TermValidatorFactory;

/**
 * @covers \Wikibase\MediaInfo\ChangeOp\Deserialization\MediaInfoChangeOpDeserializer
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

		$labelsChangeOpDeserializer = $this->createMock( LabelsChangeOpDeserializer::class );
		$labelsChangeOpDeserializer->expects( $this->never() )
			->method( 'createEntityChangeOp' );

		$descriptionsChangeOpDeserializer = $this->createMock( DescriptionsChangeOpDeserializer::class );
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
			$this->createMock( LabelsChangeOpDeserializer::class ),
			$this->createMock( DescriptionsChangeOpDeserializer::class ),
			$this->createMock( ClaimsChangeOpDeserializer::class )
		);

		$this->expectException( ChangeOpDeserializationException::class );
		$mediaInfoChangeOpDeserializer->createEntityChangeOp( [ 'aliases' => [] ] );
	}

	public function testCreateEntityChangeOp_withSiteLinksThrowsException() {
		$mediaInfoChangeOpDeserializer = new MediaInfoChangeOpDeserializer(
			$this->createMock( LabelsChangeOpDeserializer::class ),
			$this->createMock( DescriptionsChangeOpDeserializer::class ),
			$this->createMock( ClaimsChangeOpDeserializer::class )
		);

		$this->expectException( ChangeOpDeserializationException::class );
		$mediaInfoChangeOpDeserializer->createEntityChangeOp( [ 'sitelinks' => [] ] );
	}

	/**
	 * @param array[] $changeRequest
	 *
	 * @return LabelsChangeOpDeserializer
	 */
	private function getLabelsChangeOpDeserializerWithChangeRequest( array $changeRequest ) {
		$changeOpDeserializer = $this->createMock( LabelsChangeOpDeserializer::class );
		$changeOpDeserializer->expects( $this->once() )
			->method( 'createEntityChangeOp' )
			->with( $changeRequest )
			->willReturn( new ChangeOpLabel(
				'en',
				'kitten',
				$this->createMock( TermValidatorFactory::class )
			) );

		return $changeOpDeserializer;
	}

	/**
	 * @param array[] $changeRequest
	 *
	 * @return DescriptionsChangeOpDeserializer
	 */
	private function getDescriptionsChangeOpDeserializerWithChangeRequest( array $changeRequest ) {
		$changeOpDeserializer = $this->createMock( DescriptionsChangeOpDeserializer::class );
		$changeOpDeserializer->expects( $this->once() )
			->method( 'createEntityChangeOp' )
			->with( $changeRequest )
			->willReturn( new ChangeOpDescription(
				'en',
				'young cat',
				$this->createMock( TermValidatorFactory::class )
			) );

		return $changeOpDeserializer;
	}

	/**
	 * @param array[] $changeRequest
	 *
	 * @return ClaimsChangeOpDeserializer
	 */
	private function getClaimsChangeOpDeserializerWithChangeRequest( array $changeRequest ) {
		$changeOpDeserializer = $this->createMock( ClaimsChangeOpDeserializer::class );
		$changeOpDeserializer->expects( $this->once() )
			->method( 'createEntityChangeOp' )
			->with( $changeRequest )
			->willReturn( new ChangeOpRemoveStatement( 'some-guid' ) );

		return $changeOpDeserializer;
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
			$this->createMock( ClaimsChangeOpDeserializer::class )
		);
	}

	/**
	 * @return MediaInfo
	 */
	public function getEntity() {
		return new MediaInfo();
	}

}
