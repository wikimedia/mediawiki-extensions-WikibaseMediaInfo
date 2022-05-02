<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use CirrusSearch\Parser\AST\PhraseQueryNode;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\MatchPhrase;
use Elastica\Query\MatchQuery;

class PhraseQueryNodeHandler implements ParsedNodeHandlerInterface {
	/** @var PhraseQueryNode */
	private $node;

	/** @var WikibaseEntitiesHandler */
	private $entitiesHandler;

	/** @var FieldIterator */
	private $termScoringFieldIterator;

	public function __construct(
		PhraseQueryNode $node,
		WikibaseEntitiesHandler $entitiesHandler,
		array $languages,
		array $stemmingSettings,
		array $boosts,
		array $decays
	) {
		$this->node = $node;
		$this->entitiesHandler = $entitiesHandler;

		$fields = array_keys( $boosts );
		$fields = $node->isStem() ?
			array_intersect( $fields, FieldIterator::STEMMED_FIELDS ) :
			array_intersect( $fields, FieldIterator::PLAIN_FIELDS );
		// "field:[suggest] was indexed without position data; cannot run PhraseQuery"
		$fields = array_diff( $fields, [ 'suggest' ] );

		$this->termScoringFieldIterator = new FieldIterator(
			$this->getTermScoringFieldQueryBuilder( $node->getPhrase(), $node->getSlop() ),
			$fields,
			$languages,
			$stemmingSettings,
			$boosts,
			$decays
		);
	}

	public function transform(): AbstractQuery {
		$query = new BoolQuery();
		$query->setMinimumShouldMatch( 1 );

		// phrase query
		$phraseQuery = new BoolQuery();
		// filter does all the work, should's are for scoring.
		$phraseQuery->setMinimumShouldMatch( 0 );
		$field = $this->node->isStem() ? 'all' : 'all.plain';
		$phraseQuery->addFilter(
			// quick overall filter; this is faster at narrowing down
			// the resultset then matching all fields individually
			( new MatchPhrase() )
				->setFieldQuery( $field, $this->node->getPhrase() )
				->setFieldParam( $field, 'slop', max( 0, $this->node->getSlop() ) )
		);
		foreach ( $this->termScoringFieldIterator as $fieldQuery ) {
			// also add scoring clauses per field, for weighted scoring
			$phraseQuery->addShould( $fieldQuery );
		}
		$query->addShould( $phraseQuery );

		// wikibase entities (that match phrase query)
		$query->addShould( $this->entitiesHandler->transform() );

		return $query;
	}

	/**
	 * @param string $phrase
	 * @param int $slop
	 * @return FieldQueryBuilderInterface
	 */
	private function getTermScoringFieldQueryBuilder( $phrase, $slop ): FieldQueryBuilderInterface {
		return new class( $phrase, $slop ) implements FieldQueryBuilderInterface {
			/** @var string */
			private $phrase;

			/** @var int */
			private $slop;

			public function __construct( $phrase, $slop ) {
				$this->phrase = $phrase;
				$this->slop = $slop;
			}

			public function getQuery( $field, $boost ): AbstractQuery {
				return ( new MatchQuery() )
					->setFieldQuery( $field, $this->phrase )
					->setFieldBoost( $field, $boost );
			}
		};
	}
}
