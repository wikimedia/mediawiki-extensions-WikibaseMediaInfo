<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Query\FullTextQueryBuilder;
use CirrusSearch\Query\KeywordFeature;
use CirrusSearch\Search\SearchContext;
use Elastica\Query\BoolQuery;
use Wikibase\MediaInfo\Search\LTRParamBuilder\MediaSearchLTRParamBuilder;

class MediaSearchQueryBuilder implements FullTextQueryBuilder {
	public const SEARCH_PROFILE_CONTEXT_NAME = 'mediasearch';
	public const FULLTEXT_PROFILE_NAME = 'mediainfo_fulltext';
	public const LOGREG_PROFILE_NAME = 'mediasearch_logistic_regression';
	public const SYNONYMS_PROFILE_NAME = 'mediasearch_synonyms';

	private static $rescoreProfileToLtrDetailsMap = [
		'ltr_MediaSearch_20210826' =>
			[
				'model' => 'MediaSearch_20210826_xgboost_v2_34t_4d',
				'ltrParamBuilder' => 'Wikibase\MediaInfo\Search\LTRParamBuilder\MediaSearch20210826',
			],
	];

	/** @var KeywordFeature[] */
	private $features;

	/** @var MediaSearchASTQueryBuilder */
	protected $queryBuilder;

	/**
	 * @param KeywordFeature[] $features
	 * @param MediaSearchASTQueryBuilder $queryBuilder
	 */
	public function __construct(
		array $features,
		MediaSearchASTQueryBuilder $queryBuilder
	) {
		$this->features = $features;
		$this->queryBuilder = $queryBuilder;
	}

	/**
	 * Search articles with provided term.
	 *
	 * @param SearchContext $context
	 * @param string $term
	 */
	public function build( SearchContext $context, $term ) {
		foreach ( $this->features as $feature ) {
			$feature->apply( $context, $term );
		}

		$parsedQuery = $context->getSearchQuery()->getParsedQuery();
		$mainQuery = ( new BoolQuery() )
			->addMust( $this->queryBuilder->getQuery( $parsedQuery ) );
		$context->setMainQuery(
			$mainQuery
		);

		if ( isset( self::$rescoreProfileToLtrDetailsMap[$context->getRescoreProfile()] ) ) {
			$ltrDetails = self::$rescoreProfileToLtrDetailsMap[$context->getRescoreProfile()];
			/** @var MediaSearchLTRParamBuilder $paramsBuilder */
			$paramsBuilder = new $ltrDetails['ltrParamBuilder']();
			$context->setLtrParamsForModel(
				$ltrDetails['model'],
				$paramsBuilder->getModelParams(
					$mainQuery,
					$this->queryBuilder->getPrimaryLanguageCode()
				)
			);
		}
	}

	public function buildDegraded( SearchContext $searchContext ): bool {
		return false;
	}
}
