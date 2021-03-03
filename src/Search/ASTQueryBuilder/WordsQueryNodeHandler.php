<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use CirrusSearch\Parser\AST\WordsQueryNode;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\ConstantScore;
use Elastica\Query\FunctionScore;
use Elastica\Query\Match;
use Elastica\Query\MatchAll;
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

	/** @var FieldIterator */
	private $termScoringFieldIterator;

	public function __construct(
		WordsQueryNode $node,
		WikibaseEntitiesHandler $entitiesHandler,
		array $languages,
		array $stemmingSettings,
		array $boosts,
		array $decays,
		array $options = []
	) {
		$this->node = $node;
		$this->entitiesHandler = $entitiesHandler;
		$this->options = array_merge(
			[
				'hasLtrPlugin' => false,
				'normalizeFulltextScores' => true,
			],
			$options
		);

		$this->termScoringFieldIterator = new FieldIterator(
			$this->getTermScoringFieldQueryBuilder( $node->getWords() ),
			array_keys( $boosts ),
			$languages,
			$stemmingSettings,
			$boosts,
			$decays
		);
	}

	public function transform(): AbstractQuery {
		$query = $this->getScoringQuery();

		// at this point, $query contains an awful lot of logic to contribute
		// to a score, including every occurrence of any of the words;
		// however, unless a result actually contains *all* words (or a statement),
		// it shouldn't even show up in the results (no matter how often some of the
		// words are repeated)
		$query->addFilter( $this->getFilterQuery() );

		return $query;
	}

	private function getFilterQuery(): BoolQuery {
		return ( new BoolQuery() )
			->addShould(
				( new MultiMatch() )
					->setQuery( $this->node->getWords() )
					->setFields( [ 'all', 'all.plain' ] )
					->setOperator( MultiMatch::OPERATOR_AND )
			)
			->addShould( $this->entitiesHandler->transform() );
	}

	private function getScoringQuery(): BoolQuery {
		// build a query that iterates over all fields to match the given term
		$fieldsQuery = new BoolQuery();
		foreach ( $this->termScoringFieldIterator as $fieldQuery ) {
			$fieldsQuery->addShould( $fieldQuery );
		}

		if ( $this->options['normalizeFulltextScores'] ) {
			$fieldsQuery = ( new BoolQuery() )
				->addShould(
					// we'll wrap the fulltext part to normalize the scores, which
					// otherwise increase when the token count increases
					$this->normalizeFulltextScores(
						$fieldsQuery,
						$this->node->getWords()
					)
				);
		}

		$fieldsQuery->addShould( $this->entitiesHandler->transform() );

		return $fieldsQuery;
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
				return ( new Match() )
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
								// script_score must not return a negative score, which could be
								// produced when 0 < _score < 1; we'll simply ignore those for being
								// too small to make any meaningful impact anyway...
								new Script( 'max(0, ln(_score))', [], 'expression' )
							)
							// $originalQuery may include documents with a score of 0 - that's
							// perfectly acceptable, but due to the nature of this hacky workaround
							// (being based on a sum with another non-zero value), they'd end up
							// with a non-zero result; we should simply exclude zero values from
							// this calculation & leave them, untouched, at 0
							->setMinScore( 0.00000001 )
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
			->addScriptScoreFunction( new Script( 'exp(_score) / 2', [], 'expression' ) )
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
			( new Match() )->setFieldQuery( 'text', $term )
		);
	}
}
