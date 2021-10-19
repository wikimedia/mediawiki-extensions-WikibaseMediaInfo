<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use CirrusSearch\Parser\AST\ParsedNode;
use CirrusSearch\Parser\AST\ParsedQuery;
use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;
use Elastica\Query\DisMax;
use Elastica\Query\MatchNone;
use Elastica\Query\MatchQuery;
use Wikibase\MediaInfo\Search\MediaSearchASTEntitiesExtractor;
use Wikibase\Search\Elastic\Fields\StatementsField;

class WikibaseEntitiesHandler implements ParsedNodeHandlerInterface {
	/** @var ParsedNode */
	private $node;

	/** @var ParsedQuery */
	private $query;

	/** @var MediaSearchASTEntitiesExtractor */
	private $entitiesExtractor;

	/** @var float[] */
	private $searchProperties;

	/** @var array */
	private $boosts;

	/** @var bool */
	private $variableBoost;

	public function __construct(
		ParsedNode $node,
		ParsedQuery $query,
		MediaSearchASTEntitiesExtractor $entitiesExtractor,
		array $searchProperties,
		array $boosts,
		array $options
	) {
		$this->node = $node;
		$this->query = $query;
		$this->entitiesExtractor = $entitiesExtractor;
		$this->searchProperties = $searchProperties;
		$this->boosts = $boosts;
		$this->variableBoost = $options['entitiesVariableBoost'];
	}

	public function transform(): AbstractQuery {
		$entities = $this->entitiesExtractor->getEntities( $this->query, $this->node );
		if ( count( $entities ) === 0 ) {
			return new MatchNone();
		}

		$statementsQueries = [];
		$weightedTagsQueries = [];

		foreach ( $entities as $entity ) {
			foreach ( $this->searchProperties as $propertyId => $propertyWeight ) {
				$statementBoost = $this->getStatementBoost( $propertyWeight, $entity['score'] );
				if ( $statementBoost > 0 ) {
					$statementsQueries[] = $this->getFieldMatch(
						StatementsField::NAME,
						$propertyId . StatementsField::STATEMENT_SEPARATOR . $entity['entityId'],
						$statementBoost
					);
				}
			}

			if ( isset( $this->boosts['weighted_tags'] ) ) {
				// ONLY do weighted_tags queries if we have an exact match
				// weighted_tags is a very powerful search signal, so we want to be sure we're
				// searching for the right thing
				if ( $entity['score'] >= 1 ) {
					foreach ( $this->boosts['weighted_tags'] as $prefix => $weightedTagWeight ) {
						$weightedTagsQueries[] = $this->getFieldMatch(
							'weighted_tags',
							$prefix . $entity['entityId'],
							$weightedTagWeight
						);
					}
				}
			}
		}

		$statementsQuery = new DisMax();
		foreach ( $statementsQueries as $query ) {
			$statementsQuery->addQuery( $query );
		}
		$weightedTagsQuery = new BoolQuery();
		foreach ( $weightedTagsQueries as $query ) {
			$weightedTagsQuery->addShould( $query );
		}

		if ( count( $statementsQueries ) === 0 && count( $weightedTagsQueries ) === 0 ) {
			return new MatchNone();
		}
		if ( count( $weightedTagsQueries ) === 0 ) {
			return $statementsQuery;
		}
		if ( count( $statementsQueries ) === 0 ) {
			return $weightedTagsQuery;
		}
		$query = new BoolQuery();
		$query->addShould( $statementsQuery );
		$query->addShould( $weightedTagsQuery );
		return $query;
	}

	private function getStatementBoost( float $propertyWeight, float $entityScore ): float {
		if ( !isset( $this->boosts['statement'] ) ) {
			return 0.0;
		}
		$statementBoost = $this->boosts['statement'] * $propertyWeight;
		if ( $this->variableBoost ) {
			$statementBoost *= $entityScore;
		}
		return $statementBoost;
	}

	private function getFieldMatch( string $field, string $query, float $boost ): MatchQuery {
		return ( new MatchQuery() )
			->setFieldQuery( $field, $query )
			->setFieldBoost( $field, $boost );
	}
}
