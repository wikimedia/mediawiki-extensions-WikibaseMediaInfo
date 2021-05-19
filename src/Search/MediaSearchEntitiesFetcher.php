<?php

namespace Wikibase\MediaInfo\Search;

use MultiHttpClient;

class MediaSearchEntitiesFetcher {
	/** @var MultiHttpClient */
	protected $multiHttpClient;

	/** @var string */
	protected $externalEntitySearchBaseUri;

	/** @var string */
	protected $language;

	public function __construct(
		MultiHttpClient $multiHttpClient,
		string $externalEntitySearchBaseUri,
		string $language
	) {
		$this->multiHttpClient = $multiHttpClient;
		$this->externalEntitySearchBaseUri = $externalEntitySearchBaseUri;
		$this->language = $language;
	}

	/**
	 * Find wikibase entities that match given search queries and return their ids,
	 * along with a (normalized, between 0-1) score indicating good of a match
	 * they are.
	 *
	 * @param array $searchQueries
	 * @return array
	 */
	public function get( array $searchQueries ): array {
		if ( count( $searchQueries ) === 0 ) {
			return [];
		}

		$responses = $this->executeApiRequest(
			array_map( function ( $query ) {
				$params = [
					'format' => 'json',
					'action' => 'query',
					'list' => 'search',
					'srsearch' => $query,
					'srnamespace' => 0,
					'srlimit' => 50,
					'srqiprofile' => 'wikibase',
					'srprop' => 'snippet|titlesnippet|extensiondata',
					'uselang' => $this->language,
				];

				return [
					'method' => 'GET',
					'url' => $this->externalEntitySearchBaseUri . '?' . http_build_query( $params ),
				];
			}, $searchQueries )
		);

		$transformedResponses = [];
		// iterate all responses, for each search query
		foreach ( $searchQueries as $i => $term ) {
			$transformedResponses[$term] = [];
			$response = $responses[$i];
			// iterate each result
			foreach ( $response['query']['search'] ?? [] as $index => $result ) {
				$transformedResponses[$term][] = $this->transformResult( $result, $index );
			}
		}

		return $transformedResponses;
	}

	/**
	 * @param array $result
	 * @param int $index
	 * @return array
	 */
	protected function transformResult( array $result, $index ): array {
		// unfortunately, the search API doesn't return an actual score
		// (for relevancy of the match), which means that we have no way
		// of telling which results are awesome matches and which are only
		// somewhat relevant
		// since we can't rely on the order to tell us much about how
		// relevant a result is (except for relative to one another), and
		// we don't know the actual score of these results, we'll try to
		// approximate a term frequency - it won't be great, but at least
		// we'll be able to tell which of "cat" and "Pirates of Catalonia"
		// most resemble "cat"
		// the highlight will either be in extensiondata (in the case
		// of a matching alias), snippet (for descriptions), or
		// titlesnippet (for labels)
		$snippets = [
			$result['snippet'],
			$result['titlesnippet'],
			$result['extensiondata']['wikibase']['extrasnippet'] ?? ''
		];

		$maxTermFrequency = 0;
		foreach ( $snippets as $snippet ) {
			// let's figure out how much of the snippet actually matched
			// the search term based on the highlight
			$source = preg_replace( '/<span class="searchmatch">(.*?)<\/span>/', '$1', $snippet );
			$omitted = preg_replace( '/<span class="searchmatch">.*?<\/span>/', '', $snippet );
			$termFrequency = $source === '' ? 0 : 1 - mb_strlen( $omitted ) / mb_strlen( $source );
			$maxTermFrequency = max( $maxTermFrequency, $termFrequency );
		}

		// average the order in which results were returned (because that
		// takes into account additional factors such as popularity of
		// the page) and the naive term frequency to calculate how relevant
		// the results are relative to one another
		$relativeOrder = 1 / ( $index + 1 );

		return [
			'entityId' => $result['title'],
			'score' => ( $relativeOrder + $maxTermFrequency ) / 2,
		];
	}

	protected function executeApiRequest( array $requests ): array {
		$responses = $this->multiHttpClient->runMulti( $requests );
		return array_map( static function ( $response ) {
			return json_decode( $response['response']['body'], true ) ?: [];
		}, $responses );
	}
}
