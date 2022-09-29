<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use Language;
use Wikibase\DataModel\Deserializers\DeserializerFactory;
use Wikibase\DataModel\Deserializers\EntityIdDeserializer;
use Wikibase\DataModel\Deserializers\StatementListDeserializer;
use Wikibase\DataModel\Deserializers\TermListDeserializer;
use Wikibase\DataModel\Serializers\SerializerFactory;
use Wikibase\DataModel\Serializers\StatementListSerializer;
use Wikibase\DataModel\Serializers\TermListSerializer;
use Wikibase\Lib\ContentLanguages;
use Wikibase\Lib\LanguageWithConversion;
use Wikibase\Lib\TermLanguageFallbackChain;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;
use Wikibase\MediaInfo\View\MediaInfoView;

/**
 * @coversNothing
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class EntityTypesTest extends \PHPUnit\Framework\TestCase {

	private function getRegistry() {
		return require __DIR__ . '/../../../WikibaseMediaInfo.entitytypes.php';
	}

	public function testEntityTypes() {
		$registry = $this->getRegistry();

		$this->assertEquals(
			[ 'mediainfo' ],
			array_keys( $registry )
		);
	}

	/**
	 * @return SerializerFactory
	 */
	private function getSerializerFactory() {
		$serializerFactory = $this->createMock( SerializerFactory::class );

		$serializerFactory->expects( $this->once() )
			->method( 'newTermListSerializer' )
			->willReturn( $this->createMock( TermListSerializer::class ) );

		$serializerFactory->expects( $this->once() )
			->method( 'newStatementListSerializer' )
			->willReturn( $this->createMock( StatementListSerializer::class ) );

		return $serializerFactory;
	}

	public function testSerializerFactoryCallback() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'serializer-factory-callback', $registry['mediainfo'] );

		$callback = $registry['mediainfo']['serializer-factory-callback'];
		$this->assertIsCallable( $callback );

		$mediaInfoSerializer = call_user_func( $callback, $this->getSerializerFactory() );
		$this->assertInstanceOf( MediaInfoSerializer::class, $mediaInfoSerializer );
	}

	private function getDeserializerFactory() {
		$deserializerFactory = $this->createMock( DeserializerFactory::class );

		$deserializerFactory->expects( $this->once() )
			->method( 'newEntityIdDeserializer' )
			->willReturn( $this->createMock( EntityIdDeserializer::class ) );

		$deserializerFactory->expects( $this->once() )
			->method( 'newTermListDeserializer' )
			->willReturn( $this->createMock( TermListDeserializer::class ) );

		$deserializerFactory->expects( $this->once() )
			->method( 'newStatementListDeserializer' )
			->willReturn( $this->createMock( StatementListDeserializer::class ) );

		return $deserializerFactory;
	}

	public function testDeserializerFactoryCallback() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'deserializer-factory-callback', $registry['mediainfo'] );

		$callback = $registry['mediainfo']['deserializer-factory-callback'];
		$this->assertIsCallable( $callback );

		$mediaInfoDeserializer = call_user_func( $callback, $this->getDeserializerFactory() );
		$this->assertInstanceOf( MediaInfoDeserializer::class, $mediaInfoDeserializer );
	}

	public function testViewFactoryCallback() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'view-factory-callback', $registry['mediainfo'] );

		$callback = $registry['mediainfo']['view-factory-callback'];
		$this->assertIsCallable( $callback );

		$stubContentLanguages = $this->createStub( ContentLanguages::class );
		$stubContentLanguages->method( 'hasLanguage' )
			->willReturn( true );
		$mediaInfoView = call_user_func(
			$callback,
			Language::factory( 'en' ),
			new TermLanguageFallbackChain( [ LanguageWithConversion::factory( 'en' ) ], $stubContentLanguages ),
			new MediaInfo()
		);

		$this->assertInstanceOf( MediaInfoView::class, $mediaInfoView );
	}

	public function testContentModelId() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'content-model-id', $registry['mediainfo'] );

		$modelId = $registry['mediainfo']['content-model-id'];
		$this->assertSame( MediaInfoContent::CONTENT_MODEL_ID, $modelId );
	}

	public function testContentHandlerFactoryCallback() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'content-handler-factory-callback', $registry['mediainfo'] );

		$callback = $registry['mediainfo']['content-handler-factory-callback'];
		$this->assertIsCallable( $callback );

		$mediaInfoHandler = call_user_func( $callback );
		$this->assertInstanceOf( MediaInfoHandler::class, $mediaInfoHandler );
	}

}
