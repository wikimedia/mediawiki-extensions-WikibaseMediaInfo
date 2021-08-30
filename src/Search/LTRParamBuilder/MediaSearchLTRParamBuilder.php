<?php

namespace Wikibase\MediaInfo\Search\LTRParamBuilder;

use Elastica\Query\AbstractQuery;

interface MediaSearchLTRParamBuilder {
	public function getModelParams( AbstractQuery $query, string $language ): array;
}
