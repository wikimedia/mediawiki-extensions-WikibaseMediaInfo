<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\Query\FullTextQueryStringQueryBuilder;
use CirrusSearch\Search\SearchContext;
use CirrusSearch\SearchConfig;
use Elastica\Query\BoolQuery;
use Elastica\Query\DisMax;
use Elastica\Query\Match;
use Elastica\Query\MultiMatch;
use Elastica\Query\Terms;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MediaWikiServices;
use WANObjectCache;
use Wikibase\Lib\LanguageFallbackChainFactory;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\Search\Elastic\Fields\StatementsField;

class MediaQueryBuilder extends FullTextQueryStringQueryBuilder {

	public const SEARCH_PROFILE_CONTEXT_NAME = 'mediasearch';
	public const FULLTEXT_PROFILE_NAME = 'mediainfo_fulltext';

	/** @var array */
	protected $settings;
	/** @var array */
	protected $stemmingSettings;
	/** @var string */
	protected $userLanguage;
	/** @var HttpRequestFactory */
	protected $httpRequestFactory;
	/** @var WANObjectCache */
	protected $objectCache;
	/** @var array */
	protected $searchProperties;
	/** @var string */
	protected $externalEntitySearchBaseUri;
	/** @var \Wikibase\Lib\TermLanguageFallbackChain */
	protected $languageFallbackChain;
	/** @var array */
	protected $entitiesForTerm = [];

	public function __construct(
		SearchConfig $config,
		array $features,
		array $settings,
		array $stemmingSettings,
		string $userLanguage,
		HttpRequestFactory $httpRequestFactory,
		WANObjectCache $objectCache,
		array $searchProperties,
		string $externalEntitySearchBaseUri,
		LanguageFallbackChainFactory $languageFallbackChainFactory
	) {
		parent::__construct( $config, $features );
		$this->settings = array_replace_recursive(
			[
				'boost' => [
					'statement' => 1.0,
					'caption' => 1.0,
					'title' => 1.0,
					'category' => 1.0,
					'heading' => 1.0,
					'auxiliary_text' => 1.0,
					'file_text' => 1.0,
					'redirect.title' => 1.0,
					'suggest' => 1.0,
					'text' => 1.0,
					'non-file_namespace_boost' => 1.0,
				],
				'decay' => [
					'caption-fallback' => 1.0,
				],
			],
			$settings
		);
		$this->stemmingSettings = $stemmingSettings;
		$this->userLanguage = $userLanguage;
		$this->httpRequestFactory = $httpRequestFactory;
		$this->objectCache = $objectCache;
		$this->searchProperties = $searchProperties;
		$this->externalEntitySearchBaseUri = $externalEntitySearchBaseUri;
		$this->languageFallbackChain = $languageFallbackChainFactory
			->newFromLanguageCode( $userLanguage );
	}

	/**
	 * Create fulltext builder from global environment.
	 * @param array $settings Configuration from config file
	 * @return MediaQueryBuilder
	 * @throws \MWException
	 */
	public static function newFromGlobals( array $settings ) {
		global $wgMediaInfoProperties,
			$wgMediaInfoMediaSearchProperties,
			$wgMediaInfoExternalEntitySearchBaseUri;
		$repo = WikibaseRepo::getDefaultInstance();
		$configFactory = MediaWikiServices::getInstance()->getConfigFactory();
		$stemmingSettings = $configFactory->makeConfig( 'WikibaseCirrusSearch' )->get( 'UseStemming' );
		$searchConfig = $configFactory->makeConfig( 'CirrusSearch' );
		if ( !$searchConfig instanceof SearchConfig ) {
			throw new \MWException( 'CirrusSearch config must be instanceof SearchConfig' );
		}
		$features = ( new FullTextKeywordRegistry( $searchConfig ) )->getKeywords();

		return new static(
			$searchConfig,
			$features,
			$settings,
			$stemmingSettings,
			$repo->getUserLanguage()->getCode(),
			MediaWikiServices::getInstance()->getHttpRequestFactory(),
			MediaWikiServices::getInstance()->getMainWANObjectCache(),
			$wgMediaInfoMediaSearchProperties ?? array_fill_keys( array_values( $wgMediaInfoProperties ), 1 ),
			$wgMediaInfoExternalEntitySearchBaseUri,
			$repo->getLanguageFallbackChainFactory()
		);
	}

	/**
	 * @inheritDoc
	 */
	protected function isPhraseRescoreNeeded( SearchContext $context ) {
		if ( $context->isSyntaxUsed( 'query_string' ) ) {
			return parent::isPhraseRescoreNeeded( $context );
		}

		// don't perform fulltext-based phrase rescore, as it would massively
		// overpower statement matches
		return false;
	}

	/**
	 * Search articles with provided term.
	 *
	 * @param SearchContext $context
	 * @param array $fields
	 * @param array $nearMatchFields
	 * @param string $queryString
	 * @param string $nearMatchQuery
	 * @return \Elastica\Query\AbstractQuery|BoolQuery|\Elastica\Query\QueryString
	 */
	protected function buildSearchTextQuery(
		SearchContext $context,
		array $fields,
		array $nearMatchFields,
		$queryString,
		$nearMatchQuery
	) {
		if ( $context->isSyntaxUsed( 'query_string' ) ) {
			return parent::buildSearchTextQuery( $context, $fields,
				$nearMatchFields, $queryString, $nearMatchQuery );
		}
		$term = $queryString;
		$filter = new BoolQuery();
		$filter->addShould( $this->createFulltextFilterQuery( $term ) );
		$statementsFilterQuery = $this->createStatementsFilterQuery( $term );
		if ( $statementsFilterQuery ) {
			$filter->addShould( $statementsFilterQuery );
		}

		$rankingQueries = [
			$this->createTitleRankingQuery( $term ),
			$this->createTextRankingQuery( $term )
		];
		$statementsRankingQuery = $this->createStatementsRankingQuery( $term );
		if ( $statementsRankingQuery ) {
			$rankingQueries[] = $statementsRankingQuery;
		}
		if ( isset( $this->settings['boost']['non-file_namespace_boost'] ) ) {
			$rankingQueries[] = $this->createNonFileNamespaceRankingQuery( $term );
		}

		$query = new BoolQuery();
		$query->addFilter( $filter );
		$query->addShould( $rankingQueries );

		return $query;
	}

	protected function createFulltextFilterQuery( string $term ) : MultiMatch {
		$fields = [ 'all', 'all.plain' ];
		if ( !empty( $this->stemmingSettings[$this->userLanguage]['query'] ) ) {
			$fields[] = 'descriptions.' . $this->userLanguage;
		}
		$searchLanguageCodes = $this->languageFallbackChain->getFetchLanguageCodes();
		foreach ( $searchLanguageCodes as $fallbackCode ) {
			if ( $fallbackCode === $this->userLanguage ) {
				continue;
			}
			if ( !empty( $this->stemmingSettings[$fallbackCode]['query'] ) ) {
				$fields[] = 'descriptions.' . $fallbackCode;
			}
		}

		// No need to add non-stemmed caption fields to the filter, as caption data is copied
		// into opening_text and therefore will be found via the 'all' field
		return ( new MultiMatch() )
			->setFields( $fields )
			->setQuery( $term )
			->setOperator( MultiMatch::OPERATOR_AND );
	}

	protected function createStatementsFilterQuery( $term ) : ?BoolQuery {
		$statementTerms = $this->getStatementTerms( $term );
		if ( count( $statementTerms ) === 0 ) {
			return null;
		}

		$statementQuery = new BoolQuery();
		foreach ( $statementTerms as $statementTerm ) {
			$statementQuery->addShould( new Match(
				StatementsField::NAME,
				[
					'query' => $statementTerm['term'],
				]
			) );
		}
		return $statementQuery;
	}

	/**
	 * A ranking query for text-like fields
	 *
	 * @param string $term
	 * @return BoolQuery
	 */
	protected function createTextRankingQuery( string $term ) : BoolQuery {
		$query = new BoolQuery();

		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['heading'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'heading^3', 'heading.plain^1' ] )
		);

		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['auxiliary_text'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'auxiliary_text^3', 'auxiliary_text.plain^1' ] )
		);

		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['text'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'text^3', 'text.plain^1' ] )
		);

		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['file_text'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'file_text^3', 'file_text.plain^1' ] )
		);

		return $query;
	}

	/**
	 * A ranking query for title-like fields
	 *
	 * @param string $term
	 * @return BoolQuery
	 */
	protected function createTitleRankingQuery( string $term ) : BoolQuery {
		$query = new BoolQuery();

		// captions in user's own language
		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['caption'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields(
					array_merge(
						!empty( $this->stemmingSettings[$this->userLanguage]['query'] ) ?
							[ 'descriptions.' . $this->userLanguage . '^3' ] :
							[],
						[ 'descriptions.' . $this->userLanguage . '.plain^1' ]
					)
				)
		);

		// captions in fallback language
		$searchLanguageCodes = $this->languageFallbackChain->getFetchLanguageCodes();
		$fallbackLanguageCodes = array_diff( $searchLanguageCodes, [ $this->userLanguage ] );
		foreach ( $fallbackLanguageCodes as $i => $fallbackCode ) {
			// decay x% for each fallback language
			$decayedBoost = $this->settings['boost']['caption'] *
							( $this->settings['decay']['caption-fallback'] ** ( $i + 1 ) );
			$query->addShould(
				( new MultiMatch() )
					->setQuery( $term )
					->setParam( 'boost', $decayedBoost )
					->setParam( 'minimum_should_match', 1 )
					->setType( 'most_fields' )
					->setFields(
						array_merge(
							!empty( $this->stemmingSettings[$fallbackCode]['query'] ) ?
								[ 'descriptions.' . $fallbackCode . '^3' ] : [],
							[ 'descriptions.' . $fallbackCode . '.plain^1' ]
						)
					)
			);
		}

		// other fulltext fields, similar to original Cirrus fulltext search
		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['title'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'title^3', 'title.plain^1' ] )
		);

		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['category'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'category^3', 'category.plain^1' ] )
		);

		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['redirect.title'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'redirect.title^3', 'redirect.title.plain^1' ] )
		);

		$query->addShould(
			( new MultiMatch() )
				->setQuery( $term )
				->setParam( 'boost', $this->settings['boost']['suggest'] )
				->setParam( 'minimum_should_match', 1 )
				->setType( 'most_fields' )
				->setFields( [ 'suggest' ] )
		);

		return $query;
	}

	protected function createStatementsRankingQuery( string $term ) : ?DisMax {
		$statementTerms = $this->getStatementTerms( $term );
		if ( count( $statementTerms ) === 0 ) {
			return null;
		}

		$tokenBoost = $this->getTokenBoost( $term );

		$query = new DisMax();
		foreach ( $statementTerms as $statementTerm ) {
			$query->addQuery(
				( new Match() )
					->setFieldQuery( StatementsField::NAME, $statementTerm['term'] )
					->setFieldBoost( StatementsField::NAME, $statementTerm['boost'] * $tokenBoost )
			);
		}
		return $query;
	}

	protected function getTokens( string $term ) : array {
		// don't simply split on space: hyphenated words etc. are also
		// considered separate tokens - let's consider any uninterrupted
		// sequence of letters, marks, numbers & symbols a token
		if ( !preg_match_all( '/[\p{L}\p{M}\p{N}\p{S}]+/u', $term, $matches ) ) {
			return [];
		}

		$tokens = $matches[0];

		// ignore case differences & strip uniques
		$tokens = array_map( 'strtolower', $tokens );
		$tokens = array_unique( $tokens );

		return $tokens;
	}

	/**
	 * When a search term consists of multiple tokens, multiple things can
	 * contribute to the score & they can reach a higher combined score than
	 * when there was just 1 token.
	 *
	 * Not all tokens are worth the same, though. The more words there are,
	 * the less they matter: not all words are going to be repeated throughout
	 * all text in equal amounts.
	 *
	 * An analysis of a large variety of popular search terms indicates that,
	 * on average, every additional token is worth about half the score of
	 * only 1 token.
	 *
	 * Avg total scores per token, roughly - based on ~125 popular queries:
	 * | 1      | 2      | 3      | 4      # token count
	 * | 71     | 108    | 135    | 181    # max score
	 *
	 * This is a naive PHP-based implementation; ideally we'd get this straight
	 * from ElasticSearch (and exclude duplicates, stopwords, ...), though
	 * we'd need to look into whether that's even possible.
	 *
	 * @param string $term
	 * @return float
	 */
	protected function getTokenBoost( string $term ) : float {
		$tokens = $this->getTokens( $term );

		$tokenBoost = 0.5;
		foreach ( $tokens as $token ) {
			// stopwords (e.g. "the") and extremely common words (e.g. "do") will
			// also not (or barely) contribute to the score, but are not filtered
			// out in above tokens
			// we have no way of reliably filtering out such terms or estimating
			// their impact on the score, but they are increasingly likely to
			// occur in longer, multi-word search terms...
			// one thing most stopwords (in latin languages at least) have in common
			// is that they are short; let's use the character length as somewhat
			// of a proxy for how likely a token is to be a stopword, decaying the
			// additional boost more the shorted the word is
			$limit = 4;

			// use strlen instead of mb_strlen - bytecount is perfect, that'll cause
			// non-latin languages - where words are often fewer, more complex
			// characters - to bypass this decay
			$length = strlen( $token );
			$decay = max( 0, $limit - $length ) / $limit;

			$tokenBoost += 0.5 * ( 1 - $decay );
		}

		return $tokenBoost;
	}

	protected function createNonFileNamespaceRankingQuery( string $term ) : BoolQuery {
		$titleMatch = ( new MultiMatch() )
			->setFields( [ 'all_near_match^2', 'all_near_match.asciifolding^1.5' ] )
			->setQuery( $term )
			->setOperator( MultiMatch::OPERATOR_AND );

		return ( new BoolQuery() )
			->addMust( $titleMatch )
			->addFilter(
				new Terms(
					'namespace',
					[ NS_MAIN, NS_CATEGORY ]
				)
			)
			->setBoost( $this->settings['boost']['non-file_namespace_boost'] );
	}

	public function buildDegraded( SearchContext $searchContext ) : bool {
		return false;
	}

	protected function getStatementTerms( $term ) : array {
		$statementTerms = [];
		$matchingWikibaseItems = $this->getMatchingWikibaseItems( $term );
		if ( count( $matchingWikibaseItems ) === 0 ) {
			return $statementTerms;
		}

		$boost = $this->settings['boost']['statement'];
		foreach ( $matchingWikibaseItems as $item ) {
			foreach ( $this->searchProperties as $propertyId => $propertyWeight ) {
				$statementTerms[] = [
					'term' => $propertyId . StatementsField::STATEMENT_SEPARATOR . $item['entityId'],
					'boost' => $propertyWeight * $boost * $item['score'],
				];
			}
		}
		return $statementTerms;
	}

	/**
	 * This is a wrapper around fetchMatchingWikibaseData where the actual data
	 * is fetched. This simply reads from/writes to 2 intermediate caching levels:
	 * - in a property to allow for repeated calls within the same execution thread
	 * - in a separate key-value store, for follow-up requests (e.g. loading next
	 *   batch of results for the same term)
	 *
	 * @param string $term
	 * @return array
	 */
	protected function getMatchingWikibaseItems( string $term ): array {
		if ( !isset( $this->entitiesForTerm[$term] ) ) {
			$cacheKey = $this->objectCache->makeGlobalKey( 'wbmi-mediasearch-entities', $term );
			$data = $this->objectCache->getWithSetCallback(
				$cacheKey,
				$this->objectCache::TTL_DAY,
				function () use ( $term ) {
					return $this->fetchMatchingWikibaseData( $term );
				}
			);

			$this->entitiesForTerm[$term] = $data;
		}

		return $this->entitiesForTerm[$term];
	}

	/**
	 * Find wikibase entities that match a given search term and return their ids,
	 * along with a (normalized, between 0-1) score indicating good of a match
	 * they are.
	 *
	 * @param string $term
	 * @return array
	 */
	protected function fetchMatchingWikibaseData( string $term ): array {
		$params = [
			'format' => 'json',
			'action' => 'query',
			'list' => 'search',
			'srsearch' => $term,
			'srnamespace' => 0,
			'srlimit' => 50,
			'srqiprofile' => 'wikibase',
			'srprop' => 'snippet|titlesnippet|extensiondata',
			'uselang' => $this->userLanguage,
		];
		$response = $this->apiRequest( $params );

		return array_map( function ( $result, $i ) {
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
			$relativeOrder = 1 / ( $i + 1 );

			return [
				'entityId' => $result['title'],
				'score' => ( $relativeOrder + $maxTermFrequency ) / 2,
			];
		}, $response['query']['search'] ?? [], array_keys( $response['query']['search'] ?? [] ) );
	}

	protected function apiRequest( array $params ) : array {
		$url = $this->externalEntitySearchBaseUri . '?' . http_build_query( $params );
		$request = $this->httpRequestFactory->create( $url, [], __METHOD__ );
		$request->execute();
		$data = $request->getContent();

		return json_decode( $data, true ) ?: [];
	}
}
