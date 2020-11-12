<?php

namespace Wikibase\MediaInfo\Search;

use CirrusSearch\Parser\AST\BooleanClause;
use CirrusSearch\Parser\AST\EmptyQueryNode;
use CirrusSearch\Parser\AST\FuzzyNode;
use CirrusSearch\Parser\AST\KeywordFeatureNode;
use CirrusSearch\Parser\AST\NamespaceHeaderNode;
use CirrusSearch\Parser\AST\NegatedNode;
use CirrusSearch\Parser\AST\ParsedBooleanNode;
use CirrusSearch\Parser\AST\ParsedNode;
use CirrusSearch\Parser\AST\ParsedQuery;
use CirrusSearch\Parser\AST\PhrasePrefixNode;
use CirrusSearch\Parser\AST\PhraseQueryNode;
use CirrusSearch\Parser\AST\PrefixNode;
use CirrusSearch\Parser\AST\Visitor\Visitor;
use CirrusSearch\Parser\AST\WildcardNode;
use CirrusSearch\Parser\AST\WordsQueryNode;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\DisMax;
use Elastica\Query\FunctionScore;
use Elastica\Query\Match;
use Elastica\Query\MatchNone;
use Elastica\Query\MultiMatch;
use Elastica\Script\Script;
use SplObjectStorage;
use Wikibase\Search\Elastic\Fields\StatementsField;
use Wikimedia\Assert\Assert;

class MediaSearchASTQueryBuilder implements Visitor {
	private const LANGUAGE_AWARE_FIELDS = [ 'descriptions' ];

	private const LANGUAGE_AGNOSTIC_FIELDS = [
		// title
		'title',
		'category',
		'redirect.title',
		'suggest',
		// related to content
		'heading',
		'auxiliary_text',
		'text',
		'file_text',
	];

	/** @var SplObjectStorage */
	private $map;

	/** @var ParsedQuery */
	private $parsedQuery;

	/** @var MediaSearchASTEntitiesExtractor */
	private $entitiesExtractor;

	/** @var float[] */
	private $searchProperties;

	/** @var array[] */
	private $stemmingSettings;

	/** @var string[] */
	private $languages;

	/** @var float[] */
	private $boosts;

	/** @var float[] */
	private $decays;

	/** @var bool */
	private $normalizeFulltextScores;

	/**
	 * @param MediaSearchASTEntitiesExtractor $entitiesExtractor
	 * @param float[] $searchProperties Properties to search statements in ([ propertyId => weight ])
	 * @param array[] $stemmingSettings Stemming settings (see $wgWBCSUseStemming)
	 * @param string[] $languages Languages to search text in
	 * @param array[] $settings Optional weight/decay overrides
	 */
	public function __construct(
		MediaSearchASTEntitiesExtractor $entitiesExtractor,
		array $searchProperties,
		array $stemmingSettings,
		array $languages,
		array $settings = []
	) {
		$this->entitiesExtractor = $entitiesExtractor;
		$this->searchProperties = $searchProperties;
		$this->stemmingSettings = $stemmingSettings;
		$this->languages = $languages;
		$this->boosts = ( $settings['boost'] ?? [] ) + [
			'statement' => 1.0,
			'descriptions' => 1.0,
			'title' => 1.0,
			'category' => 1.0,
			'heading' => 1.0,
			'auxiliary_text' => 1.0,
			'file_text' => 1.0,
			'redirect.title' => 1.0,
			'suggest' => 1.0,
			'text' => 1.0,
		];
		$this->decays = ( $settings['decay'] ?? [] ) + [
			'descriptions' => 1.0,
		];
		$this->normalizeFulltextScores = (bool)( $settings['normalizeFulltextScores'] ?? true );
	}

	public function getQuery( ParsedQuery $parsedQuery ): AbstractQuery {
		$this->map = new SplObjectStorage();
		$this->parsedQuery = $parsedQuery;
		$root = $parsedQuery->getRoot();
		$root->accept( $this );
		return $this->map[$root] ?? new MatchNone();
	}

	public function visitParsedBooleanNode( ParsedBooleanNode $node ) {
		$query = new BoolQuery();

		foreach ( $node->getClauses() as $clause ) {
			$clauseNode = $clause->getNode();
			$clauseNode->accept( $this );
			if ( isset( $this->map[$clauseNode] ) ) {
				switch ( $clause->getOccur() ) {
					case BooleanClause::SHOULD:
						$query->addShould( $this->map[$clauseNode] );
						break;
					case BooleanClause::MUST:
						$query->addMust( $this->map[$clauseNode] );
						break;
					case BooleanClause::MUST_NOT:
						$query->addMustNot( $this->map[$clauseNode] );
						break;
				}
			}
		}

		if ( $query->count() > 0 ) {
			$this->map[$node] = $query;
		}
	}

	public function visitBooleanClause( BooleanClause $clause ) {
		// BooleanClause is being handled in visitParsedBooleanNode already,
		// this will not be visited
	}

	public function visitWordsQueryNode( WordsQueryNode $node ) {
		// we'll wrap the fulltext part inside another boolquery, so that
		// we can then wrap that once more to normalize the scores, which
		// otherwise increase when the token count increases
		$fullTextQuery = new BoolQuery();

		foreach ( static::LANGUAGE_AGNOSTIC_FIELDS as $field ) {
			$fullTextQuery->addShould(
				( new MultiMatch() )
					->setQuery( $node->getWords() )
					->setParam( 'boost', $this->boosts[$field] ?? 0 )
					->setType( 'most_fields' )
					->setFields( [ "$field^3", "$field.plain^1" ] )
			);
		}

		foreach ( static::LANGUAGE_AWARE_FIELDS as $field ) {
			foreach ( $this->languages as $index => $language ) {
				// decay x% for each fallback language
				$boost = ( $this->boosts[$field] ?? 0 ) * ( ( $this->decays[$field] ?? 0 ) ** $index );

				$fullTextQuery->addShould(
					( new MultiMatch() )
						->setQuery( $node->getWords() )
						->setParam( 'boost', $boost ?? 0 )
						->setType( 'most_fields' )
						->setFields(
							( $this->stemmingSettings[$language]['query'] ?? false ) ?
								[ "$field.$language^3", "$field.$language.plain^1" ] :
								[ "$field.$language.plain^1" ]
						)
				);
			}
		}

		$query = ( new BoolQuery() )
			->addShould( $this->normalizeFulltextScores( $fullTextQuery, $node->getWords() ) )
			->addShould( $this->getStatementsQuery( $node ) );

		// at this point, $query contains an awful lot of logic to contribute
		// to a score, including every occurrence of any of the words;
		// however, unless a result actually contains *all* words (or a statement),
		// it shouldn't even show up in the results (no matter how often some of the
		// words are repeated)
		$query->addFilter(
			( new BoolQuery() )
				->addShould(
					( new MultiMatch() )
						->setQuery( $node->getWords() )
						->setFields( [ 'all', 'all.plain' ] )
						->setOperator( MultiMatch::OPERATOR_AND )
				)
				->addShould( $this->getStatementsQuery( $node ) )
		);

		$this->map[$node] = $query;
	}

	public function visitPhraseQueryNode( PhraseQueryNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'PhraseQueryNode not (yet) supported.' );
	}

	public function visitPhrasePrefixNode( PhrasePrefixNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'PhrasePrefixNode not (yet) supported.' );
	}

	public function visitNegatedNode( NegatedNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'NegatedNode not (yet) supported.' );
	}

	public function visitFuzzyNode( FuzzyNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'FuzzyNode not (yet) supported.' );
	}

	public function visitPrefixNode( PrefixNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'PrefixNode not (yet) supported.' );
	}

	public function visitWildcardNode( WildcardNode $node ) {
		// @phan-suppress-next-line PhanImpossibleCondition
		Assert::invariant( false, 'WildcardNode not (yet) supported.' );
	}

	public function visitEmptyQueryNode( EmptyQueryNode $node ) {
		// nothing...
	}

	public function visitKeywordFeatureNode( KeywordFeatureNode $node ) {
		// this is already dealt with elsewhere in the query building process
	}

	public function visitNamespaceHeader( NamespaceHeaderNode $node ) {
		// this is already dealt with elsewhere in the query building process
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
		if ( $this->normalizeFulltextScores === false ) {
			return $originalQuery;
		}

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
	 * @return MatchExplorerQuery
	 */
	private function getTermsCountQuery( string $term ): MatchExplorerQuery {
		return new MatchExplorerQuery(
			MatchExplorerQuery::TYPE_UNIQUE_TERMS_COUNT,
			// match 'text' field because the analyzer applied there
			// is likely to be most relevant to how search term is interpreted
			// in terms of stripping stopwords etc; text.plain, for example,
			// doesn't exclude those
			( new Match() )->setFieldQuery( 'text', $term )
		);
	}

	private function getStatementsQuery( ParsedNode $node ): AbstractQuery {
		$entities = $this->entitiesExtractor->getEntities( $this->parsedQuery, $node );
		if ( count( $entities ) === 0 ) {
			return new MatchNone();
		}

		$query = new DisMax();
		foreach ( $entities as $entity ) {
			foreach ( $this->searchProperties as $propertyId => $propertyWeight ) {
				$match = new Match();
				$match->setFieldQuery(
					StatementsField::NAME,
					$propertyId . StatementsField::STATEMENT_SEPARATOR . $entity['entityId']
				);
				$match->setFieldBoost(
					StatementsField::NAME,
					$propertyWeight * $this->boosts['statement'] * $entity['score']
				);

				$query->addQuery( $match );
			}
		}

		return $query;
	}
}
