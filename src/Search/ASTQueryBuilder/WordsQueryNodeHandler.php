<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use CirrusSearch\Parser\AST\WordsQueryNode;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\DisMax;
use Elastica\Query\MatchQuery;
use Elastica\Query\MultiMatch;

class WordsQueryNodeHandler implements ParsedNodeHandlerInterface {
	/** @var WordsQueryNode */
	private $node;

	/** @var WikibaseEntitiesHandler */
	private $entitiesHandler;

	/** @var float[] */
	private $decays;

	/** @var FieldIterator[] */
	private $termScoringFieldIterators;

	public function __construct(
		WordsQueryNode $node,
		WikibaseEntitiesHandler $entitiesHandler,
		array $languages,
		array $synonyms,
		array $synonymsLanguages,
		array $stemmingSettings,
		array $boosts,
		array $decays
	) {
		$fulltextBoosts = array_intersect_key(
			$boosts,
			array_flip(
				array_merge( FieldIterator::LANGUAGE_AGNOSTIC_FIELDS,
					FieldIterator::LANGUAGE_AWARE_FIELDS )
			)
		);
		$this->node = $node;
		$this->entitiesHandler = $entitiesHandler;
		$this->decays = $decays;

		$this->termScoringFieldIterators[$node->getWords()] = new FieldIterator(
			$this->getTermScoringFieldQueryBuilder( $node->getWords() ),
			array_keys( $fulltextBoosts ),
			$languages,
			$stemmingSettings,
			$fulltextBoosts,
			$decays
		);

		// create iterators for all synonyms, where the scores are applied to the boost
		foreach ( $synonyms as $term => $score ) {
			$termLanguages = $synonymsLanguages[$term] ?? [];
			$this->termScoringFieldIterators[$term] = new FieldIterator(
				$this->getTermScoringFieldQueryBuilder( $term ),
				array_keys( $fulltextBoosts ),
				$termLanguages,
				$stemmingSettings,
				array_map( static function ( $boost ) use ( $score ) {
					return $boost * $score;
				}, $fulltextBoosts ),
				$decays
			);
		}
	}

	public function transform(): AbstractQuery {
		// we (may) have multiple terms to match (the original search term,
		// but also synonyms), which we'll wrap them all in a dis_max to
		// ensure that the scores don't spiral out of control and grow too
		// large with too many synonyms
		// that said, if/when a document matches multiple synonyms, that's
		// a fairly strong indication that it's a pretty good match for the
		// subject, so we'll add a tiebreaker to allow some additional boost
		// (though these additional matches won't be worth as much)
		$termsDisMax = new DisMax();
		$termsDisMax->setTieBreaker( $this->decays['synonyms'] ?? 0 );

		// search term
		$termQuery = new BoolQuery();
		$termQuery->setMinimumShouldMatch( 0 );
		$termQuery->addFilter(
			( new MultiMatch() )
				->setQuery( $this->node->getWords() )
				->setFields( [ 'all', 'all.plain' ] )
				->setOperator( MultiMatch::OPERATOR_AND )
		);
		// build a boolquery that matches all fields for a given term
		foreach ( $this->termScoringFieldIterators[$this->node->getWords()] as $fieldQuery ) {
			$termQuery->addShould( $fieldQuery );
		}
		// add term query (filter + normalized scoring clause per field) to global boolquery
		$termsDisMax->addQuery( $termQuery );

		// synonyms for search term
		// this is very similar as with the original search term above,
		// except that we'll be more strict in the filter & expect a
		// phrase match
		// they'll be wrapped inside another dis_max group to make sure
		// that only the single best synonym can contribute to the score,
		// because synonyms are often minor variations of similar text
		// and could lead to massively inflated text matches in such case
		$synonyms = array_diff( array_keys( $this->termScoringFieldIterators ), [ $this->node->getWords() ] );
		if ( count( $synonyms ) > 0 ) {
			$synonymsDisMax = new DisMax();
			foreach ( $synonyms as $synonym ) {
				$synonymQuery = new BoolQuery();
				$synonymQuery->setMinimumShouldMatch( 0 );
				$synonymQuery->addFilter(
					( new MultiMatch() )
						->setQuery( $synonym )
						->setFields( [ 'all' ] )
						// needs to be exact (phrase) match to avoid, as much as
						// possible, false positives
						->setType( 'phrase' )
				);
				foreach ( $this->termScoringFieldIterators[$synonym] as $fieldQuery ) {
					$synonymQuery->addShould( $fieldQuery );
				}
				$synonymsDisMax->addQuery( $synonymQuery );
			}
			$termsDisMax->addQuery( $synonymsDisMax );
		}

		$query = new BoolQuery();
		$query->setMinimumShouldMatch( 1 );
		// search term + synonyms
		$query->addShould( $termsDisMax );
		// wikibase entities
		$query->addShould( $this->entitiesHandler->transform() );

		return $query;
	}

	/**
	 * @param string $term
	 * @return FieldQueryBuilderInterface
	 */
	private function getTermScoringFieldQueryBuilder( $term ): FieldQueryBuilderInterface {
		return new class( $term ) implements FieldQueryBuilderInterface {
			/** @var string */
			private $term;

			public function __construct( $term ) {
				$this->term = $term;
			}

			public function getQuery( $field, $boost ): AbstractQuery {
				return ( new MatchQuery() )
					->setFieldQuery( $field, $this->term )
					->setFieldBoost( $field, $boost );
			}
		};
	}
}
