<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki;

use Deserializers\Deserializer;
use PHPUnit_Framework_TestCase;
use Serializers\Serializer;
use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\LanguageFallbackChain;
use Wikibase\MediaInfo\Content\MediaInfoContent;
use Wikibase\MediaInfo\Content\MediaInfoHandler;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;
use Wikibase\MediaInfo\View\MediaInfoView;
use Wikibase\View\EditSectionGenerator;

/**
 * @covers WikibaseMediaInfo.entitytypes.php
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class EntityTypesTest extends PHPUnit_Framework_TestCase {

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

	private function getSerializerFactory() {
		$serializerFactory = $this->getMockBuilder( SerializerFactory::class )
			->disableOriginalConstructor()
			->getMock();

		$serializerFactory->expects( $this->once() )
			->method( 'newTermListSerializer' )
			->will( $this->returnValue( $this->getMock( Serializer::class ) ) );

		$serializerFactory->expects( $this->once() )
			->method( 'newStatementListSerializer' )
			->will( $this->returnValue( $this->getMock( Serializer::class ) ) );

		return $serializerFactory;
	}

	public function testSerializerFactoryCallback() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'serializer-factory-callback', $registry['mediainfo'] );

		$callback = $registry['mediainfo']['serializer-factory-callback'];
		$this->assertInternalType( 'callable', $callback );

		$mediaInfoSerializer = call_user_func( $callback, $this->getSerializerFactory() );
		$this->assertInstanceOf( MediaInfoSerializer::class, $mediaInfoSerializer );
	}

	private function getDeserializerFactory() {
		$deserializerFactory = $this->getMockBuilder( DeserializerFactory::class )
			->disableOriginalConstructor()
			->getMock();

		$deserializerFactory->expects( $this->once() )
			->method( 'newTermListDeserializer' )
			->will( $this->returnValue( $this->getMock( Deserializer::class ) ) );

		$deserializerFactory->expects( $this->once() )
			->method( 'newStatementListDeserializer' )
			->will( $this->returnValue( $this->getMock( Deserializer::class ) ) );

		return $deserializerFactory;
	}

	public function testDeserializerFactoryCallback() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'deserializer-factory-callback', $registry['mediainfo'] );

		$callback = $registry['mediainfo']['deserializer-factory-callback'];
		$this->assertInternalType( 'callable', $callback );

		$mediaInfoDeserializer = call_user_func( $callback, $this->getDeserializerFactory() );
		$this->assertInstanceOf( MediaInfoDeserializer::class, $mediaInfoDeserializer );
	}

	public function testViewFactoryCallback() {
		$registry = $this->getRegistry();

		$this->assertArrayHasKey( 'mediainfo', $registry );
		$this->assertArrayHasKey( 'view-factory-callback', $registry['mediainfo'] );

		$callback = $registry['mediainfo']['view-factory-callback'];
		$this->assertInternalType( 'callable', $callback );

		$mediaInfoView = call_user_func(
			$callback,
			'de',
			$this->getMock( LabelDescriptionLookup::class ),
			new LanguageFallbackChain( [] ),
			$this->getMock( EditSectionGenerator::class )
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
		$this->assertInternalType( 'callable', $callback );

		$mediaInfoHandler = call_user_func( $callback );
		$this->assertInstanceOf( MediaInfoHandler::class, $mediaInfoHandler );
	}

}
