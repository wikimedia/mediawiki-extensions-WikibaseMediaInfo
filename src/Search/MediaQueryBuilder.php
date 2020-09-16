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
use Wikibase\Lib\LanguageFallbackChainFactory;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\Search\Elastic\Fields\StatementsField;

class MediaQueryBuilder extends FullTextQueryStringQueryBuilder {

	public const SEARCH_PROFILE_CONTEXT_NAME = 'mediasearch';
	public const FULLTEXT_PROFILE_NAME = 'mediainfo_fulltext';

	/** @var array */
	private $settings;
	/** @var array */
	private $stemmingSettings;
	/** @var string */
	private $userLanguage;
	/** @var HttpRequestFactory */
	private $httpRequestFactory;
	/** @var array */
	private $defaultProperties;
	/** @var string */
	private $externalEntitySearchBaseUri;
	/** @var \Wikibase\Lib\TermLanguageFallbackChain */
	private $languageFallbackChain;
	/** @var array */
	private $idsForTerm = [];

	public function __construct(
		SearchConfig $config,
		array $features,
		array $settings,
		array $stemmingSettings,
		string $userLanguage,
		HttpRequestFactory $httpRequestFactory,
		array $defaultProperties,
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
					'opening_text' => 1.0,
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
		$this->defaultProperties = $defaultProperties;
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
			array_values( $wgMediaInfoProperties ),
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

	private function createFulltextFilterQuery( string $term ) : MultiMatch {
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

	private function createStatementsFilterQuery( $term ) : ?BoolQuery {
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
	private function createTextRankingQuery( string $term ) : BoolQuery {
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
	private function createTitleRankingQuery( string $term ) : BoolQuery {
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

	private function createStatementsRankingQuery( string $term ) : ?DisMax {
		$statementTerms = $this->getStatementTerms( $term );
		if ( count( $statementTerms ) === 0 ) {
			return null;
		}

		$query = new DisMax();
		foreach ( $statementTerms as $statementTerm ) {
			$query->addQuery(
				( new Match() )
					->setFieldQuery( StatementsField::NAME, $statementTerm['term'] )
					->setFieldBoost( StatementsField::NAME, $statementTerm['boost'] )
			);
		}
		return $query;
	}

	private function createNonFileNamespaceRankingQuery( string $term ) : BoolQuery {
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

	private function getStatementTerms( $term ) : array {
		$statementTerms = [];
		$matchingWikibaseItemIds = $this->findMatchingWikibaseItemIds( $term );
		if ( count( $matchingWikibaseItemIds ) === 0 ) {
			return $statementTerms;
		}

		$boost = $this->settings['boost']['statement'];
		foreach ( $matchingWikibaseItemIds as $itemId => $itemBoost ) {
			foreach ( $this->defaultProperties as $propertyId ) {
				$statementTerms[] = [
					'term' => $propertyId . StatementsField::STATEMENT_SEPARATOR . $itemId,
					'boost' => $boost * $itemBoost,
				];
			}
		}
		return $statementTerms;
	}

	private function findMatchingWikibaseItemIds( string $term ): array {
		if ( isset( $this->idsForTerm[$term] ) ) {
			return $this->idsForTerm[$term];
		}
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
		$itemIds = [];
		$matches = $response['query']['search'] ?? [];
		foreach ( $matches as $i => $match ) {
			// the highlight will either be in extensiondata (in the case
			// of a matching alias), snippet (for descriptions), or
			// titlesnippet (for labels)
			$snippets = [
				$match['snippet'],
				$match['titlesnippet'],
				$match['extensiondata']['wikibase']['extrasnippet'] ?? ''
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
			$itemIds[$match['title']] = ( $relativeOrder + $maxTermFrequency ) / 2;
		}

		$this->idsForTerm[$term] = $itemIds;
		return $itemIds;
	}

	private function apiRequest( array $params ) : array {
		$url = $this->externalEntitySearchBaseUri . '?' . http_build_query( $params );
		$request = $this->httpRequestFactory->create( $url, [], __METHOD__ );
		$request->execute();
		$data = $request->getContent();

		return json_decode( $data, true ) ?: [];
	}
}
