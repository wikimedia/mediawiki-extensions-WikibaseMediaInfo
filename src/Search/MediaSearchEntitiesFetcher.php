<?php

namespace Wikibase\MediaInfo\Search;

use MultiHttpClient;

class MediaSearchEntitiesFetcher {
	/** @var MultiHttpClient */
	protected $multiHttpClient;

	/** @var string */
	protected $entitySearchUrl;

	/** @var string */
	protected $titleMatchUrl;

	/** @var string */
	protected $inputLanguage;

	/** @var string */
	protected $outputLanguage;

	public function __construct(
		MultiHttpClient $multiHttpClient,
		string $entitySearchUrl,
		string $titleMatchUrl,
		string $inputLanguage,
		string $outputLanguage
	) {
		$this->multiHttpClient = $multiHttpClient;
		$this->entitySearchUrl = $entitySearchUrl;
		$this->titleMatchUrl = $titleMatchUrl;
		$this->inputLanguage = $inputLanguage;
		$this->outputLanguage = $outputLanguage;
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

		$entitySearchRequests = $this->gatherEntitySearchRequests( $searchQueries );
		$titleMatchRequests = $this->gatherTitleMatchRequests( $searchQueries );

		$responses = $this->multiHttpClient->runMulti(
			array_merge( $entitySearchRequests, $titleMatchRequests )
		);

		$transformedResponses = array_fill_keys(
			array_values( $searchQueries ),
			[]
		);
		foreach ( $responses as $response ) {
			$body = json_decode( $response['response']['body'], true ) ?: [];
			$term = $response['_term'];
			if ( $response['_type'] === 'entitySearch' ) {
				// iterate each result
				foreach ( $body['query']['pages'] ?? [] as $result ) {
					$transformedResponses[$term] = $this->addToTransformedResponses(
						$transformedResponses[$term],
						$this->transformEntitySearchResult( $result )
					);
				}
			} else {
				$titleMatch = $this->transformTitleMatchResult( $body );
				if ( $titleMatch ) {
					$transformedResponses[$term] = $this->addToTransformedResponses(
						$transformedResponses[$term],
						$titleMatch
					);
				}
			}
		}

		// Sort items by score.
		foreach ( $transformedResponses as $i => $term ) {
			$scores = array_column( $term, 'score' );
			array_multisort( $scores, SORT_DESC, $transformedResponses[$i] );
		}

		return $transformedResponses;
	}

	private function gatherEntitySearchRequests( array $searchQueries ): array {
		return array_map( function ( $query ) {
			$params = [
				'format' => 'json',
				'action' => 'query',
				'generator' => 'search',
				'gsrsearch' => $query,
				'gsrnamespace' => 0,
				'gsrlimit' => 50,
				'gsrprop' => 'snippet|titlesnippet|extensiondata',
				'uselang' => $this->inputLanguage,
				'prop' => 'entityterms',
				'wbetterms' => 'alias|label',
				'wbetlanguage' => $this->outputLanguage,
			];

			return [
				'method' => 'GET',
				'_term' => $query,
				'_type' => 'entitySearch',
				'url' => $this->entitySearchUrl . '?' . http_build_query( $params ),
			];
		}, $searchQueries );
	}

	private function gatherTitleMatchRequests( array $searchQueries ): array {
		if ( !$this->titleMatchUrl ) {
			return [];
		}
		return array_map( function ( $query ) {
			$params = [
				'format' => 'json',
				'action' => 'query',
				// ucfirst() the string, and strip quotes (in case the query comes from
				// a phrase query)
				'titles' => $this->mbUcFirst( trim( $query, " \n\r\t\v\0\"" ) ),
				'prop' => 'pageprops',
				'redirects' => 1,
			];

			return [
				'method' => 'GET',
				'_term' => $query,
				'_type' => 'titleMatch',
				'url' => sprintf( $this->titleMatchUrl, $this->inputLanguage ) . '?' .
						 http_build_query( $params ),
			];
		}, $searchQueries );
	}

	/**
	 * Replicates php's ucfirst() function with multibyte support.
	 *
	 * @param string $str The string being converted.
	 * @param null|string $encoding Optional encoding parameter is the character encoding.
	 * 	If it is omitted, the internal character encoding value will be used.
	 *
	 * @return string The input string with first character uppercased.
	 * @see https://github.com/cofirazak/phpMissingFunctions/blob/master/src/StringFunc.php
	 */
	public function mbUcFirst( string $str, string $encoding = null ): string {
		if ( $encoding === null ) {
			$encoding = mb_internal_encoding();
		}

		return mb_strtoupper( mb_substr( $str, 0, 1, $encoding ), $encoding ) .
			   mb_substr( $str, 1, null, $encoding );
	}

	private function transformTitleMatchResult( array $result ): ?array {
		if ( isset( $result['query']['pages'] ) ) {
			$page = array_shift( $result['query']['pages'] );
			if ( isset( $page['pageprops']['wikibase_item'] ) ) {
				return [
					'entityId' => $page['pageprops']['wikibase_item'],
					'score' => 1.0,
					'synonyms' => array_column( $result['query']['redirects'] ?? [], 'to' ),
				];
			}
		}
		return null;
	}

	private function addToTransformedResponses( array $collection, array $item ) {
		if ( !isset( $collection[ $item['entityId'] ] ) ) {
			$collection[ $item['entityId'] ] = $item;
			return $collection;
		}
		$collection[ $item['entityId'] ] = [
			'entityId' => $item['entityId'],
			'synonyms' => array_merge(
				$collection[ $item['entityId'] ]['synonyms'] ?? [],
				$item['synonyms'] ?? []
			),
			'score' => max( $collection[ $item['entityId'] ]['score'], $item['score'] ),
		];
		return $collection;
	}

	/**
	 * @param array $result
	 * @return array
	 */
	protected function transformEntitySearchResult( array $result ): array {
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
		$relativeOrder = 1 / $result['index'];

		$synonyms = [];
		if ( isset( $result['entityterms'] ) ) {
			$synonyms = array_merge(
				$synonyms,
				$result['entityterms']['label'] ?? [],
				$result['entityterms']['alias'] ?? []
			 );
		}

		return [
			'entityId' => $result['title'],
			'score' => ( $relativeOrder + $maxTermFrequency ) / 2,
			'synonyms' => $synonyms,
		];
	}
}
