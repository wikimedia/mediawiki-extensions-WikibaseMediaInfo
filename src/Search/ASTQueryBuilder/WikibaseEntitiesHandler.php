<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use CirrusSearch\Parser\AST\ParsedNode;
use CirrusSearch\Parser\AST\ParsedQuery;
use Elastica\Query\AbstractQuery;
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

	/** @var float[] */
	private $boosts;

	/** @var bool */
	private $variableBoost;

	public function __construct(
		ParsedNode $node,
		ParsedQuery $query,
		MediaSearchASTEntitiesExtractor $entitiesExtractor,
		array $searchProperties,
		array $boosts,
		bool $variableBoost = true
	) {
		$this->node = $node;
		$this->query = $query;
		$this->entitiesExtractor = $entitiesExtractor;
		$this->searchProperties = $searchProperties;
		$this->boosts = $boosts;
		$this->variableBoost = $variableBoost;
	}

	public function transform(): AbstractQuery {
		$entities = $this->entitiesExtractor->getEntities( $this->query, $this->node );
		if ( count( $entities ) === 0 ) {
			return new MatchNone();
		}

		$query = new DisMax();
		foreach ( $entities as $entity ) {
			foreach ( $this->searchProperties as $propertyId => $propertyWeight ) {
				$match = new MatchQuery();
				$match->setFieldQuery(
					StatementsField::NAME,
					$propertyId . StatementsField::STATEMENT_SEPARATOR . $entity['entityId']
				);

				$fieldBoost = $this->boosts['statement'] * $propertyWeight;
				if ( $this->variableBoost ) {
					$fieldBoost *= $entity['score'];
				}

				$match->setFieldBoost(
					StatementsField::NAME,
					$fieldBoost
				);

				$query->addQuery( $match );
			}
		}

		return $query;
	}
}
