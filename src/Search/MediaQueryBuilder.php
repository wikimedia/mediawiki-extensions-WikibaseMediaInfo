<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\FullTextKeywordRegistry;
use CirrusSearch\Query\FullTextQueryBuilder;
use CirrusSearch\Query\KeywordFeature;
use CirrusSearch\Search\SearchContext;
use CirrusSearch\SearchConfig;
use Elastica\Query\BoolQuery;
use Elastica\Query\ConstantScore;
use Elastica\Query\Match;
use Elastica\Query\MultiMatch;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\MediaWikiServices;
use Wikibase\Lib\LanguageFallbackChainFactory;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\Search\Elastic\Fields\StatementsField;

class MediaQueryBuilder implements FullTextQueryBuilder {

	public const SEARCH_PROFILE_CONTEXT_NAME = 'mediasearch';
	public const FULLTEXT_PROFILE_NAME = 'mediainfo_fulltext';

	/** @var KeywordFeature[] */
	private $features;
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
	/** @var \Wikibase\Lib\LanguageFallbackChain */
	private $languageFallbackChain;
	/** @var array */
	private $idsForTerm = [];

	public function __construct(
		array $features,
		array $settings,
		array $stemmingSettings,
		string $userLanguage,
		HttpRequestFactory $httpRequestFactory,
		array $defaultProperties,
		string $externalEntitySearchBaseUri,
		LanguageFallbackChainFactory $languageFallbackChainFactory
	) {
		$this->features = $features;
		$this->settings = array_merge(
			[
				'statement' => 1.0,
				'statement-discount' => 1.0,
				'caption' => 1.0,
				'caption-fallback-discount' => 1.0,
				'all' => 1.0,
				'all.plain' => 1.0,
				'title' => 1.0,
				'redirect.title' => 1.0,
				'category' => 1.0,
				'text' => 1.0,
				'auxiliary_text' => 1.0,
				'file_text' => 1.0,
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
	 * Search articles with provided term.
	 *
	 * @param SearchContext $searchContext
	 * @param string $term term to search
	 */
	public function build( SearchContext $searchContext, $term ) {
		// Transform Mediawiki specific syntax to filters and extra
		// (pre-escaped) query string
		foreach ( $this->features as $feature ) {
			$term = $feature->apply( $searchContext, $term );
		}
		$term = trim( $term );

		$filter = new BoolQuery();
		$filter->addShould( $this->createFulltextQuery( $term ) );
		$statementsQuery = $this->createStatementsQueries( $term );
		if ( $statementsQuery ) {
			$filter->addShould( $statementsQuery );
		}

		$rankingMatches = [];
		foreach ( $this->getStatementTerms( $term ) as $statementTerm ) {
			$rankingMatches[] = ( new ConstantScore() )
				->setFilter(
					( new Match() )
						->setFieldQuery( StatementsField::NAME, $statementTerm['term'] )
				)
				->setBoost( $statementTerm['boost'] );
		}
		foreach ( $this->getFulltextFields() as $field ) {
			$rankingMatches[] = ( new Match() )
				->setFieldQuery( $field['field'], $term )
				->setFieldBoost( $field['field'], $field['boost'] );
		}
		foreach ( $this->getOtherRankingFields() as $field ) {
			$rankingMatches[] = ( new Match() )
				->setFieldQuery( $field['field'], $term )
				->setFieldBoost( $field['field'], $field['boost'] );
		}

		$query = new BoolQuery();
		$query->addFilter( $filter );
		$query->addShould( $rankingMatches );

		$searchContext->setMainQuery( $query );
	}

	private function createFulltextQuery( string $term ) : MultiMatch {
		return ( new MultiMatch() )
			->setFields(
				array_map(
					function ( $value ) {
						return $value['field'];
					},
					$this->getFulltextFields()
				)
			)
			->setType( 'cross_fields' )
			->setQuery( $term )
			->setOperator( 'and' );
	}

	private function getFulltextFields() : array {
		$fields = [
			[
				'field' => 'descriptions.' . $this->userLanguage . '.plain',
				'boost' => $this->settings['caption'],
			]
		];
		if ( !empty( $this->stemmingSettings[$this->userLanguage]['query'] ) ) {
			$fields[] = [
				'field' => 'descriptions.' . $this->userLanguage,
				'boost' => $this->settings['caption'],
			];
		}

		$searchLanguageCodes = $this->languageFallbackChain->getFetchLanguageCodes();

		$boost = $this->settings['caption'] * $this->settings['caption-fallback-discount'];
		foreach ( $searchLanguageCodes as $fallbackCode ) {
			if ( $fallbackCode === $this->userLanguage ) {
				continue;
			}

			$fields[] = [
				'field' => 'descriptions.' . $fallbackCode . '.plain',
				'boost' => $boost,
			];
			if ( !empty( $this->stemmingSettings[$fallbackCode]['query'] ) ) {
				$fields[] = [
					'field' => 'descriptions.' . $fallbackCode,
					'boost' => $boost,
				];
			}
			$boost *= $this->settings['caption-fallback-discount'];
		}

		$fields[] = [ 'field' => 'all', 'boost' => $this->settings['all'] ];
		$fields[] = [ 'field' => 'all.plain', 'boost' => $this->settings['all.plain'] ];
		$fields[] = [ 'field' => 'category', 'boost' => $this->settings['category'] ];

		return $fields;
	}

	public function buildDegraded( SearchContext $searchContext ) : bool {
		return false;
	}

	private function createStatementsQueries( $term ) : ?BoolQuery {
		$statementTerms = $this->getStatementTerms( $term );
		if ( count( $statementTerms ) == 0 ) {
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

	private function getStatementTerms( $term ) : array {
		$statementTerms = [];
		$matchingWikibaseItemIds = $this->findMatchingWikibaseItemIds( $term );
		if ( count( $matchingWikibaseItemIds ) == 0 ) {
			return $statementTerms;
		}

		$boost = $this->settings['statement'];
		foreach ( $matchingWikibaseItemIds as $itemId ) {
			foreach ( $this->defaultProperties as $propertyId ) {
				$statementTerms[] = [
					'term' => $propertyId . StatementsField::STATEMENT_SEPARATOR . $itemId,
					'boost' => $boost,
				];
			}
			$boost *= $this->settings['statement-discount'];
		}
		return $statementTerms;
	}

	private function findMatchingWikibaseItemIds( string $term ): array {
		if ( isset( $this->idsForTerm[$term] ) ) {
			return $this->idsForTerm[$term];
		}
		$params = [
			'format' => 'json',
			'action' => 'wbsearchentities',
			'search' => $term,
			'type' => 'item',
			'language' => $this->userLanguage,
			'strictlanguage' => false,
			// Get the maximum number of results
			'limit' => 50,
		];

		$response = $this->apiRequest( $params );

		// the match must not be partial
		// i.e. 'cat' can match the 'house cat' or 'computerized axial tomography' items
		// (who have a 'cat' and 'CAT' alias respectively), but must not match
		// 'category' or 'Catalase'
		$itemIds = [];
		foreach ( $response['search'] ?? [] as $match ) {
			if ( strtolower( $match['match']['text'] ) === strtolower( $term ) ) {
				$itemIds[] = $match['id'];
			}
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

	private function getOtherRankingFields() : array {
		return [
			[ 'field' => 'title', 'boost' => $this->settings['title'] ],
			[ 'field' => 'redirect.title', 'boost' => $this->settings['redirect.title'] ],
			[ 'field' => 'text', 'boost' => $this->settings['text'] ],
			[ 'field' => 'auxiliary_text', 'boost' => $this->settings['auxiliary_text'] ],
			[ 'field' => 'file_text', 'boost' => $this->settings['file_text'] ],
		];
	}
}
