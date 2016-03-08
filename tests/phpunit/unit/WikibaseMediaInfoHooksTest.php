<?php

namespace Wikibase\MediaInfo\Tests;

use Deserializers\Deserializer;
use PHPUnit_Framework_TestCase;
use Serializers\Serializer;
use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoDeserializer;
use Wikibase\MediaInfo\DataModel\Serialization\MediaInfoSerializer;
use Wikibase\MediaInfo\WikibaseMediaInfoHooks;

/**
 * @covers Wikibase\MediaInfo\WikibaseMediaInfoHooks
 *
 * @license GPL-2.0+
 * @author Bene* < benestar.wikimedia@gmail.com >
 */
class WikibaseMediaInfoHooksTest extends PHPUnit_Framework_TestCase {

	public function testOnUnitTestsList() {
		$paths = [ 'foo' ];
		WikibaseMediaInfoHooks::onUnitTestsList( $paths );

		$this->assertSame( 'foo', $paths[0] );
		$this->assertSame( realpath( __DIR__ . '/../' ), realpath( $paths[1] ) );
	}

	public function testOnWikibaseRepoEntityTypes() {
		$entityTypeDefinitions = [
			'item' => [ 'foo', 'bar' ]
		];

		WikibaseMediaInfoHooks::onWikibaseRepoEntityTypes( $entityTypeDefinitions );

		$this->assertArrayHasKey( 'item', $entityTypeDefinitions );
		$this->assertSame( [ 'foo', 'bar' ], $entityTypeDefinitions['item'] );

		$this->assertArrayHasKey( 'mediainfo', $entityTypeDefinitions );
		$this->assertSerializerFactoryCallback( $entityTypeDefinitions['mediainfo'] );
		$this->assertDeserializerFactoryCallback( $entityTypeDefinitions['mediainfo'] );
	}

	public function testOnWikibaseClientEntityTypes() {
		$entityTypeDefinitions = [
			'item' => [ 'foo', 'bar' ]
		];

		WikibaseMediaInfoHooks::onWikibaseClientEntityTypes( $entityTypeDefinitions );

		$this->assertArrayHasKey( 'item', $entityTypeDefinitions );
		$this->assertSame( [ 'foo', 'bar' ], $entityTypeDefinitions['item'] );

		$this->assertArrayHasKey( 'mediainfo', $entityTypeDefinitions );
		$this->assertSerializerFactoryCallback( $entityTypeDefinitions['mediainfo'] );
		$this->assertDeserializerFactoryCallback( $entityTypeDefinitions['mediainfo'] );
	}

	private function assertSerializerFactoryCallback( array $definitions ) {
		$this->assertArrayHasKey( 'serializer-factory-callback', $definitions );
		$callback = $definitions['serializer-factory-callback'];
		$this->assertInternalType( 'callable', $callback );

		$serializerFactory = $this->getMockBuilder( SerializerFactory::class )
			->disableOriginalConstructor()
			->getMock();

		$serializerFactory->expects( $this->once() )
			->method( 'newTermListSerializer' )
			->will( $this->returnValue( $this->getMock( Serializer::class ) ) );

		$serializerFactory->expects( $this->once() )
			->method( 'newStatementListSerializer' )
			->will( $this->returnValue( $this->getMock( Serializer::class ) ) );

		$mediaInfoSerializer = call_user_func( $callback, $serializerFactory );

		$this->assertInstanceOf( MediaInfoSerializer::class, $mediaInfoSerializer );
	}

	private function assertDeserializerFactoryCallback( array $definitions ) {
		$this->assertArrayHasKey( 'deserializer-factory-callback', $definitions );
		$callback = $definitions['deserializer-factory-callback'];
		$this->assertInternalType( 'callable', $callback );

		$deserializerFactory = $this->getMockBuilder( DeserializerFactory::class )
			->disableOriginalConstructor()
			->getMock();

		$deserializerFactory->expects( $this->once() )
			->method( 'newTermListDeserializer' )
			->will( $this->returnValue( $this->getMock( Deserializer::class ) ) );

		$deserializerFactory->expects( $this->once() )
			->method( 'newStatementListDeserializer' )
			->will( $this->returnValue( $this->getMock( Deserializer::class ) ) );

		$mediaInfoSerializer = call_user_func( $callback, $deserializerFactory );

		$this->assertInstanceOf( MediaInfoDeserializer::class, $mediaInfoSerializer );
	}

}
