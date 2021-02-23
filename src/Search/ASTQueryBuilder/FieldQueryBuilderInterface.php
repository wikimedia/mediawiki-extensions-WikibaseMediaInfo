<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use Elastica\Query\AbstractQuery;

interface FieldQueryBuilderInterface {
	/**
	 * @param string $field
	 * @param float $boost
	 * @return AbstractQuery
	 */
	public function getQuery( $field, $boost ): AbstractQuery;
}
