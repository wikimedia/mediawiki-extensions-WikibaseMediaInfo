<?php

namespace Wikibase\MediaInfo\Search;

use Elastica\Query\AbstractQuery;

/**
 * Implementation of "match_explorer" query from ltr-query plugin
 *
 * @link https://github.com/o19s/elasticsearch-learning-to-rank
 */
class MatchExplorerQuery extends AbstractQuery {
	public const TYPE_SUM_CLASSIC_IDF = 'sum_classic_idf';
	public const TYPE_MEAN_CLASSIC_IDF = 'mean_classic_idf';
	public const TYPE_MAX_CLASSIC_IDF = 'max_classic_idf';
	public const TYPE_MIN_CLASSIC_IDF = 'min_classic_idf';
	public const TYPE_STDDEV_CLASSIC_IDF = 'stddev_classic_idf';
	public const TYPE_SUM_RAW_DF = 'sum_raw_df';
	public const TYPE_MEAN_RAW_DF = 'mean_raw_df';
	public const TYPE_MAX_RAW_DF = 'max_raw_df';
	public const TYPE_MIN_RAW_DF = 'min_raw_df';
	public const TYPE_STDDEV_RAW_DF = 'stddev_raw_df';
	public const TYPE_SUM_RAW_TTF = 'sum_raw_ttf';
	public const TYPE_MEAN_RAW_TTF = 'mean_raw_ttf';
	public const TYPE_MAX_RAW_TTF = 'max_raw_ttf';
	public const TYPE_MIN_RAW_TTF = 'min_raw_ttf';
	public const TYPE_STDDEV_RAW_TTF = 'stddev_raw_ttf';
	public const TYPE_UNIQUE_TERMS_COUNT = 'unique_terms_count';

	/**
	 * @param string $type
	 * @param AbstractQuery $query
	 */
	public function __construct( string $type, AbstractQuery $query ) {
		$this->setType( $type )
			->setQuery( $query );
	}

	/**
	 * @param string $type
	 * @return self
	 */
	public function setType( string $type ) {
		$this->setParam( 'type', $type );

		return $this;
	}

	/**
	 * @param AbstractQuery $query
	 * @return self
	 */
	public function setQuery( AbstractQuery $query ) {
		$this->setParam( 'query', $query );

		return $this;
	}
}
