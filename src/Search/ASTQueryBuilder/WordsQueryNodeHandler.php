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

class WordsQueryNodeHandler extends AbstractTextNodeHandler {
	/** @var WordsQueryNode */
	private $node;

	/** @var WikibaseEntitiesHandler */
	private $entitiesHandler;

	/** @var bool */
	private $hasLtrPlugin;

	public function __construct(
		WordsQueryNode $node,
		WikibaseEntitiesHandler $entitiesHandler,
		array $languages,
		array $stemmingSettings,
		array $boosts,
		array $decays,
		bool $hasLtrPlugin = false
	) {
		parent::__construct(
			$languages,
			$stemmingSettings,
			$boosts,
			$decays
		);
		$this->entitiesHandler = $entitiesHandler;
		$this->node = $node;
		$this->hasLtrPlugin = $hasLtrPlugin;
	}

	protected function buildQueryForField( $field, $boost = 0 ): AbstractQuery {
		return ( new Match() )
			->setFieldQuery( $field, $this->node->getWords() )
			->setFieldBoost( $field, $boost );
	}

	public function transform(): AbstractQuery {
		$query = new BoolQuery();

		$query->addShould(
			// we'll wrap the fulltext part to normalize the scores, which
			// otherwise increase when the token count increases
			$this->normalizeFulltextScores(
				parent::transform(),
				$this->node->getWords()
			)
		);
		$query->addShould( $this->entitiesHandler->transform() );

		// at this point, $query contains an awful lot of logic to contribute
		// to a score, including every occurrence of any of the words;
		// however, unless a result actually contains *all* words (or a statement),
		// it shouldn't even show up in the results (no matter how often some of the
		// words are repeated)
		$query->addFilter(
			( new BoolQuery() )
				->addShould(
					( new MultiMatch() )
						->setQuery( $this->node->getWords() )
						->setFields( [ 'all', 'all.plain' ] )
						->setOperator( MultiMatch::OPERATOR_AND )
				)
				->addShould( $this->entitiesHandler->transform() )
		);

		return $query;
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
					)
					->addShould(
						( new FunctionScore() )
							->setQuery( $termsCountQuery )
							->addScriptScoreFunction(
								new Script( 'ln(1 / max(1, min(1.25, _score)))', [], 'expression' )
							)
					)
			)
			->addScriptScoreFunction( new Script( 'exp(_score)', [], 'expression' ) )
			// setting a minimum score simply prevents documents from being dropped
			// when used inside a must_not clause
			->setMinScore( 0 );
	}

	/**
	 * @param string $term
	 * @return AbstractQuery
	 */
	private function getTermsCountQuery( string $term ): AbstractQuery {
		if ( !$this->hasLtrPlugin ) {
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
