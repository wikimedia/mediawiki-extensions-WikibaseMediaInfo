<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use CirrusSearch\Parser\AST\WordsQueryNode;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\ConstantScore;
use Elastica\Query\DisMax;
use Elastica\Query\FunctionScore;
use Elastica\Query\MatchAll;
use Elastica\Query\MatchQuery;
use Elastica\Query\MultiMatch;
use Elastica\Script\Script;
use Wikibase\MediaInfo\Search\MatchExplorerQuery;

class WordsQueryNodeHandler implements ParsedNodeHandlerInterface {
	/** @var WordsQueryNode */
	private $node;

	/** @var WikibaseEntitiesHandler */
	private $entitiesHandler;

	/** @var array */
	private $options;

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
		array $decays,
		array $options = []
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
		$this->options = array_merge(
			[
				'hasLtrPlugin' => false,
				'normalizeFulltextScores' => true,
			],
			$options
		);
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
		// wrap the fulltext part to normalize the scores, which
		// otherwise increase when the token count increases
		if ( $this->options['normalizeFulltextScores'] ) {
			$termQuery = $this->normalizeFulltextScores( $termQuery, $this->node->getWords() );
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
				if ( $this->options['normalizeFulltextScores'] ) {
					$synonymQuery = $this->normalizeFulltextScores( $synonymQuery, $synonym );
				}
				$synonymsDisMax->addQuery( $synonymQuery );
			}
			$termsDisMax->addQuery( $synonymsDisMax );
		}

		$query = new BoolQuery();
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

	/**
	 * When a search term consists of multiple tokens, multiple things can
	 * contribute to the score & they can reach a higher combined score than
	 * when there was just 1 token.
	 * Not all tokens are worth the same, though. The more words there are,
	 * the less they matter: not all words are going to be repeated
	 * throughout all text in equal amounts; there appears to be a
	 * significant difference between 1 & 2, but then remains mostly
	 * constant. On average, that is, because there is an enormously
	 * wide range of scores, for any amount of tokens.
	 * An analysis of a large variety of popular search terms indicates
	 * that, on average, every additional token is worth about half the
	 * score of only 1 token.
	 * Avg max scores per token, roughly - based on ~1580 popular queries:
	 * | 1      | 2      | 3      | 4      | 5      | 6    # token count
	 * | 68     | 86.5   | 88.5   | 86.5   | 82.5   | 83   # max score
	 * Essentially, when there is more than 1 token, the score seems to
	 * increase by 1.25.
	 * This will normalize scores to the range of 1 token.
	 *
	 * @param AbstractQuery $originalQuery
	 * @param string $term
	 * @return FunctionScore
	 */
	private function normalizeFulltextScores( AbstractQuery $originalQuery, string $term ): AbstractQuery {
		$termsCountQuery = $this->getTermsCountQuery( $term );

		$largeNumber = 9999999999999999;

		// below is a convoluted way of multiplying the scores of 2 queries
		// (the statement match score, and the boost based on the amount of terms);
		// multiple queries are always summed (unless with dis_max, but that's also
		// not relevant here), but we need them multiplied...
		// using log & exp, we can simulate a multiplication, though, because:
		// exp(ln(A) + ln(B)) is actually the same as A * B
		// yay for making simply things complicated!
		// @todo after upgrading to ES7, we'll be able to simply use 2 script_score
		// (with query) and multiply them via function_score, like so:
		// function_score:
		//  - script_score:
		//    - query $statementsQuery
		//    - script: _score
		//  - script_score:
		//    - $termsCountQuery
		//    - script: 1 / min(1.25, _score)
		//  - score_mode: multiply (= default)
		return ( new FunctionScore() )
			->setQuery(
				( new BoolQuery() )
					->addMust(
						( new FunctionScore() )
							->setQuery( $originalQuery )
							->addScriptScoreFunction(
								new Script(
									// adding a large number to the score to ensure that the result
									// ends up being a positive value (which it may not otherwise be
									// when 0 < _score < 1)
									// we'll later divide the result by this value again to cancel
									// out this workaround in the final score
									"max(0, ln($largeNumber) + ln(_score))",
									[],
									'expression'
								)
							)
					)
					->addShould(
						( new FunctionScore() )
							->setQuery( $termsCountQuery )
							->addScriptScoreFunction(
								// a dividend of `2` is another hack - ES6.5+ will not permit returning
								// negative scores (which could be produced when the dividend is
								// smaller than the divisor (min(1.25, _score))
								// let's chose a dividend that's guaranteed to be larger than the
								// dividend (which in our case is capped at 1.25) to guarantee
								// that no negative value will be returned, and we'll later divide
								// that value again from the combined score
								new Script( 'ln(2 / max(1, min(1.25, _score)))', [], 'expression' )
							)
					)
			)
			->addScriptScoreFunction( new Script( "exp(_score) / 2 / $largeNumber", [], 'expression' ) )
			// setting a minimum score simply prevents documents from being dropped
			// when used inside a must_not clause
			->setMinScore( 0 );
	}

	/**
	 * @param string $term
	 * @return AbstractQuery
	 */
	private function getTermsCountQuery( string $term ): AbstractQuery {
		if ( !$this->options['hasLtrPlugin'] ) {
			// if the LTR plugin (required for this feature) is not implemented,
			// we'll fall back to a very simple & naive token count based on PHP's
			// word count - it won't take stemming config & stopwords into account,
			// but at least it won't blow up
			$count = count( array_unique( str_word_count( $term, 1 ) ) );
			return ( new ConstantScore() )
				->setFilter( new MatchAll() )
				->setBoost( $count );
		}

		return new MatchExplorerQuery(
			MatchExplorerQuery::TYPE_UNIQUE_TERMS_COUNT,
			// match 'text' field because the analyzer applied there
			// is likely to be most relevant to how search term is interpreted
			// in terms of stripping stopwords etc; text.plain, for example,
			// doesn't exclude those
			( new MatchQuery() )->setFieldQuery( 'text', $term )
		);
	}
}
