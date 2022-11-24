<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use MediaWikiIntegrationTestCase;
use MultiHttpClient;
use Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher;

/**
 * @covers \Wikibase\MediaInfo\Search\MediaSearchEntitiesFetcher
 */
class MediaSearchEntitiesFetcherTest extends MediaWikiIntegrationTestCase {
	protected function createMediaSearchEntitiesFetcher(): MediaSearchEntitiesFetcher {
		$mockMultiHttpClient = $this->createMock( MultiHttpClient::class );
		$mockMultiHttpClient->method( 'runMulti' )
			->willReturnCallback( static function ( array $requests ) {
				foreach ( $requests as $i => $request ) {
					if ( preg_match( '/&gsrsearch=(.*?)&/', $request['url'], $matches )
					) {
						$term = $matches[1];
						$filename = __DIR__ . "/../../data/entities_search/$term.json";
						$requests[$i]['response']['body'] = file_exists( $filename ) ?
							file_get_contents( $filename ) : '';
					} elseif ( preg_match( '/&titles=(.*?)&/', $request['url'],
						$matches ) ) {
						$term = $matches[1];
						$filename = __DIR__ . '/../../data/entities_search/' .
									strtolower( $term ) . '_titleMatch.json';
						$requests[$i]['response']['body'] = file_exists( $filename ) ?
							file_get_contents( $filename ) : '';
					}
				}

				return $requests;
			} );

		return new MediaSearchEntitiesFetcher(
			$mockMultiHttpClient,
			'url-not-required-for-mock',
			'url-not-required-for-mock',
			'en',
			'en'
		);
	}

	public function testGet() {
		$terms = [ 'cat', 'dog' ];

		$fetcher = $this->createMediaSearchEntitiesFetcher();
		$results = $fetcher->get( $terms );

		foreach ( $terms as $term ) {
			$this->assertArrayHasKey( $term, $results );
			$this->assertNotEmpty( $results[$term] );
			foreach ( $results[$term] as $result ) {
				$this->assertArrayHasKey( 'entityId', $result );
				$this->assertArrayHasKey( 'score', $result );
				$this->assertArrayHasKey( 'synonyms', $result );
			}
		}

		// check that the responses for cat from the entity search and title search have been
		// merged properly
		$this->assertSame( 1.0, $results['cat']['Q146']['score'] );
		$this->assertCount( 6, $results['cat']['Q146']['synonyms'] ?? [] );
	}

	public function testGetRepeatedly() {
		$terms = [ 'cat', 'dog' ];

		$fetcher = $this->createMediaSearchEntitiesFetcher();

		for ( $i = 0; $i < 3; $i++ ) {
			$results = $fetcher->get( $terms );

			foreach ( $terms as $term ) {
				$this->assertArrayHasKey( $term, $results );
				$this->assertNotEmpty( $results[$term] );
				foreach ( $results[$term] as $result ) {
					$this->assertArrayHasKey( 'entityId', $result );
					$this->assertArrayHasKey( 'score', $result );
					$this->assertArrayHasKey( 'synonyms', $result );
				}
			}
		}
	}

	public function testGetUnknownEntity() {
		$terms = [ 'donkey' ];

		$fetcher = $this->createMediaSearchEntitiesFetcher();
		$results = $fetcher->get( $terms );

		foreach ( $terms as $term ) {
			$this->assertArrayHasKey( $term, $results );
			$this->assertSame( [], $results[$term] );
		}
	}
}
