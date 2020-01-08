<?php

namespace Wikibase\MediaInfo\Api;

use ApiBase;
use ApiMain;
use ApiQuery;
use ApiQueryGeneratorBase;
use FauxRequest;
use Generator;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MediaWikiServices;
use Title;
use Wikimedia\Assert\Assert;

/**
 * This API endpoint will act as a search intermediary - interpreting the search
 * term and rewriting it to more specific search terms (that can include more
 * complex keywords and derivative structured data lookups) before then passing
 * those terms on to the search API.
 */
class ApiQueryMediaSearch extends ApiQueryGeneratorBase {

	/**
	 * @var HttpRequestFactory
	 */
	protected $httpRequestFactory;

	/**
	 * @var array string[]
	 */
	protected $defaultProperties;

	/**
	 * @var string
	 */
	protected $externalEntitySearchBaseUri;

	/**
	 * @param ApiQuery $query
	 * @param string $moduleName
	 * @param HttpRequestFactory $httpRequestFactory
	 * @param string[] $defaultProperties
	 * @param string|null $externalEntitySearchBaseUri
	 */
	public function __construct(
		ApiQuery $query,
		$moduleName,
		HttpRequestFactory $httpRequestFactory,
		array $defaultProperties,
		$externalEntitySearchBaseUri = null
	) {
		parent::__construct( $query, $moduleName, 'ms' );
		$this->httpRequestFactory = $httpRequestFactory;
		$this->defaultProperties = $defaultProperties;
		$this->externalEntitySearchBaseUri = $externalEntitySearchBaseUri;
	}

	/**
	 * @param ApiQuery $main
	 * @param string $moduleName
	 * @return self
	 */
	public static function factory( ApiQuery $main, $moduleName ) {
		global $wgMediaInfoProperties,
			$wgMediaInfoExternalEntitySearchBaseUri;

		return new static(
			$main,
			$moduleName,
			MediaWikiServices::getInstance()->getHttpRequestFactory(),
			array_values( $wgMediaInfoProperties ),
			$wgMediaInfoExternalEntitySearchBaseUri
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$params = $this->extractRequestParams();

		list( $results, $continue ) = $this->search(
			'list',
			$params['search'],
			$this->getContext()->getLanguage()->getCode(),
			$params['limit'],
			$params['continue'] ?: ''
		);

		$this->getResult()->addValue( 'query', 'mediasearch', $results );

		if ( count( $results ) >= $params['limit'] ) {
			$this->setContinueEnumParameter( 'continue', $continue );
		}
	}

	/**
	 * @inheritDoc
	 */
	public function executeGenerator( $resultPageSet ) {
		$params = $this->extractRequestParams();

		list( $results, $continue ) = $this->search(
			'generator',
			$params['search'],
			$this->getContext()->getLanguage()->getCode(),
			$params['limit'],
			$params['continue'] ?: ''
		);

		$titles = [];
		foreach ( $results as $result ) {
			$titles[$result['pageid']] = Title::newFromDBkey( $result['title'] );
		}

		$resultPageSet->populateFromTitles( $titles );

		// enrich search results with structured data
		foreach ( $results as $pageId => $result ) {
			$resultPageSet->setGeneratorData( $titles[$pageId], $results[$pageId] );
		}

		if ( count( $results ) >= $params['limit'] ) {
			$this->setContinueEnumParameter( 'continue', $continue );
		}
	}

	/**
	 * @param string $term
	 * @param string $langCode
	 * @return Generator
	 */
	protected function getIndividualSearchQueries( $term, $langCode ): Generator {
		// the limit (of 15) has no specific meaning - we just need to put
		// some limit on it, and 15 Q-ids (of ~9 characters long) + separators
		// are about half of the allowed search query length (of 300 chars),
		// leaving a reasonable enough amount of space still for the other
		// search queries, even in the event of finding many matching items
		$items = $this->findMatchingItems( $term, 15 );

		// haswbstatement:P180=Q123
		if ( count( $items ) > 0 ) {
			foreach ( $this->defaultProperties as $property ) {
				$itemIds = array_map( function ( $item ) {
					return $item['id'];
				}, $items );
				yield 'haswbstatement:' . $property . '=' . implode( '|' . $property . '=', $itemIds );
			}
		}

		// derive labels from matched items - we've already established
		// that these things are matches (by their aliases, possibly),
		// so let's use their labels to expand our search term when the
		// search term is also known as something else)
		$allTerms = array_merge( [ $term ], array_column( $items, 'label' ) );
		$allTerms = array_map( 'strtolower', $allTerms );
		$allTerms = array_unique( $allTerms );
		// use only first few terms - don't make query too absurdly long
		$relevantTerms = array_slice( $allTerms, 0, 3 );
		// rewrite terms to a format they can easily be joined in, but are
		// also still stemmed - by adding a greyspace character
		$greyspacedTerms = array_map( function ( $term ) {
			return str_replace( ' ', '_', $term );
		}, $relevantTerms );
		$derivedTerm = implode( ' OR ', $greyspacedTerms );

		// incaption:"my term@lang" + other relevant terms
		foreach ( $greyspacedTerms as $greyspacedTerm ) {
			yield 'incaption:' . $greyspacedTerm . '@' . $langCode;
		}

		// deepcat:category
		$categories = $this->findMatchingCategories( $derivedTerm, 1 );
		if ( count( $categories ) > 0 ) {
			yield 'deepcat:' . implode( '|', $categories );
		}

		// incaption:"my term@en" (default plaintext search searches all
		// content which could be any language, so let's try English captions
		// as well (if we have not already)
		// $derivedTerm doesn't make sense - the label(s) we received from
		// items were localized already
		if ( $langCode !== 'en' ) {
			yield 'incaption:' . str_replace( ' ', '_', $term ) . '@en';
		}

		// original search term, along with derived terms
		yield $derivedTerm;
	}

	/**
	 * Array of actual search queries to be performed.
	 *
	 * Here's an example of what the kind of result that would be returned,
	 * given the $term: british shorthair
	 * [
	 *   'haswbstatement:P180=Q29273',
	 *   'incaption:"british_shorthair@en" -haswbstatement:P180=Q29273',
	 *   'deepcat:British_shorthair -haswbstatement:P180=Q29273 -incaption:"british_shorthair@en"',
	 *   'british_shorthair -haswbstatement:P180=Q29273 -incaption:"british_shorthair@en" -deepcat:British_shorthair',
	 * ]
	 *
	 * @param string $term
	 * @param string $langCode
	 * @return Generator
	 */
	protected function getSearchQueries( $term, $langCode ): Generator {
		$individualQueries = $this->getIndividualSearchQueries( $term, $langCode );
		$previousQueries = [];
		foreach ( $individualQueries as $query ) {
			$search = $query;
			if ( count( $previousQueries ) > 0 ) {
				$search .= ' -' . implode( ' -', $previousQueries );
			}
			yield $search;
			$previousQueries[] = $query;
		}
	}

	/**
	 * This method will execute multiple search queries internally, in order,
	 * and combine their results.
	 *
	 * @param string $mode 'list' or 'generator'
	 * @param string $term
	 * @param string $langCode
	 * @param int $limit
	 * @param string $continue
	 * @return array [ search results, continuation value ]
	 * @throws \MWException
	 */
	protected function search( $mode, $term, $langCode, $limit, $continue = '' ): array {
		Assert::parameter( in_array( $mode, [ 'list', 'generator' ] ), $mode, '$mode' );
		Assert::parameterType( 'string', $term, '$term' );
		Assert::parameterType( 'integer', $limit, '$limit' );
		Assert::parameterType( 'string', $continue, '$continue' );

		if ( $term === '' ) {
			return [];
		}

		$prefix = $mode === 'list' ? 'sr' : 'gsr';

		$results = [];
		$queries = $this->getSearchQueries( $term, $langCode );
		$offsets = explode( '|', $continue );
		foreach ( $queries as $i => $query ) {
			// offset is always numeric, except:
			// - an empty string = the very first request (where 'continue' defaults
			//   to empty string) = start from 0
			// - when there is no offset yet = this query should start at 0
			//   (because it has not yet been executed, nothing to continue from
			// - when it's '-', which indicates this query has already been exhausted
			//   and we can skip it...
			$offset = $offsets[$i] ?? '';
			if ( $offset === '-' ) {
				continue;
			}
			$offset = (int)$offset;

			// pass derived search query along to actual search API
			$response = $this->internalApiRequest( [
				'format' => 'json',
				'action' => 'query',
				$mode => 'search',
				"${prefix}search" => $query,
				"${prefix}namespace" => NS_FILE,
				"${prefix}limit" => $limit,
				"${prefix}offset" => $offset,
			] );

			if ( $mode === 'list' ) {
				$results = array_merge( $results, $response['query']['search'] ?? [] );
			} elseif ( $mode === 'generator' ) {
				$currentResults = $response['query']['pages'] ?? [];
				foreach ( $currentResults as $j => $result ) {
					// rewrite 'index' - since we're combining multiple queries,
					// it must continue where we last left off...
					$currentResults[$j]['index'] += count( $results );
				}
				$results += $currentResults;
			}

			// update offsets (and skip once we've gathered enough results)
			if ( count( $results ) < $limit ) {
				$offsets[$i] = '-';
			} elseif ( count( $results ) >= $limit ) {
				// use search offset to continue from next time;  if there
				// is none, that means we've exhausted our results
				$offsets[$i] = $response['continue']["${prefix}offset"] ?? '-';
				break;
			}
		}
		$results = array_slice( $results, 0, $limit, true );

		return [ $results, implode( '|', $offsets ) ];
	}

	/**
	 * Returns an array of item entity ids matching the search term.
	 *
	 * @param string $term
	 * @param int $limit
	 * @return array
	 * @throws \MWException
	 */
	protected function findMatchingItems( $term, $limit = 10 ): array {
		Assert::parameterType( 'string', $term, '$term' );

		$params = [
			'format' => 'json',
			'action' => 'wbsearchentities',
			'search' => $term,
			'type' => 'item',
			'language' => $this->getContext()->getLanguage()->getCode(),
			'uselang' => $this->getContext()->getLanguage()->getCode(),
			'strictlanguage' => true,
			'limit' => $limit,
		];

		if ( $this->externalEntitySearchBaseUri ) {
			$response = $this->externalApiRequest( $this->externalEntitySearchBaseUri, $params );
		} else {
			$response = $this->internalApiRequest( $params );
		}

		// the match must not be partial
		// i.e. 'cat' can match the 'house cat' or 'computerized axial tomography' items
		// (who have a 'cat' and 'CAT' alias respectively), but must not match
		// 'category' or 'Catalase'
		$items = [];
		foreach ( $response['search'] ?? [] as $match ) {
			if ( strtolower( $match['match']['text'] ) === strtolower( $term ) ) {
				$items[] = $match;
			}
		}

		return $items;
	}

	/**
	 * Returns the categories best matching the search term.
	 *
	 * @param string $term
	 * @param int $limit
	 * @return string[]
	 * @throws \MWException
	 */
	protected function findMatchingCategories( $term, $limit = 10 ): array {
		Assert::parameterType( 'string', $term, '$term' );

		$params = [
			'format' => 'json',
			'action' => 'query',
			'list' => 'search',
			'srsearch' => $term,
			'srnamespace' => NS_CATEGORY,
			'srprop' => 'titlesnippet',
			// request more than needed - order will be done differently
			'srlimit' => $limit + 10,
		];

		$response = $this->internalApiRequest( $params );
		$results = $response['query']['search'] ?? [];

		// the only way I could think of to search title & other content at once,
		// but still favor title matches, is to just do a normal search and then
		// bubble up title matches (as extrapolated from matches in returned snippet)
		usort( $results, function ( $a, $b ) {
			$aTitleMatches = preg_match_all( '/<span class=\"searchmatch\">/', $a['titlesnippet'] );
			$bTitleMatches = preg_match_all( '/<span class=\"searchmatch\">/', $b['titlesnippet'] );
			return $bTitleMatches <=> $aTitleMatches;
		} );

		$categories = [];
		foreach ( $results as $match ) {
			$title = Title::newFromText( $match['title'], $match['ns'] );
			if ( $title !== null ) {
				$categories[] = $title->getDBkey();
			}
		}

		return array_slice( $categories, 0, $limit );
	}

	/**
	 * Performs an actual HTTP API request as opposed to `internalApiRequest`'s
	 * internal handling of the request.
	 * The external URI the API request goes out to is expected to be in the same
	 * datacenter, so there is no latency.
	 *
	 * @param string $externalUri
	 * @param array $params
	 * @return array
	 */
	protected function externalApiRequest( $externalUri, array $params = [] ): array {
		Assert::parameterType( 'string', $externalUri, '$externalUri' );
		Assert::parameterType( 'array', $params, '$params' );

		$url = $externalUri . '?' . http_build_query( $params );
		$request = $this->httpRequestFactory->create( $url, [], __METHOD__ );
		$request->execute();
		$data = $request->getContent();

		return json_decode( $data, true ) ?: [];
	}

	/**
	 * @param array $params
	 * @return array
	 * @throws \MWException
	 */
	protected function internalApiRequest( array $params = [] ): array {
		Assert::parameterType( 'array', $params, '$params' );

		// pass derived search query along to actual search API
		$request = new FauxRequest( $params );
		$api = new ApiMain( $request );
		$api->execute();

		return $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] ) ?: [];
	}

	/**
	 * @inheritDoc
	 */
	protected function getAllowedParams() {
		return [
			'search' => [
				ApiBase::PARAM_TYPE => 'string',
				ApiBase::PARAM_REQUIRED => true,
			],
			'limit' => [
				ApiBase::PARAM_DFLT => 10,
				ApiBase::PARAM_TYPE => 'limit',
				ApiBase::PARAM_MIN => 1,
				ApiBase::PARAM_MAX => ApiBase::LIMIT_BIG1,
				ApiBase::PARAM_MAX2 => ApiBase::LIMIT_BIG2
			],
			'continue' => [
				ApiBase::PARAM_HELP_MSG => 'api-help-param-continue',
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=query&list=mediasearch&mssearch=test' => 'apihelp-query+mediasearch-example',
		];
	}

	/**
	 * @inheritDoc
	 */
	public function getHelpUrls() {
		return [
			'https://www.mediawiki.org/wiki/Special:MyLanguage/Extension:WikibaseMediaInfo#API',
		];
	}

}
