<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use Elastica\Query\AbstractQuery;

interface ParsedNodeHandlerInterface {
	/**
	 * @return AbstractQuery
	 */
	public function transform(): AbstractQuery;
}
