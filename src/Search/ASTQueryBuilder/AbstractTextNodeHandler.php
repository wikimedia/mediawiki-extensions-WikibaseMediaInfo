<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use Elastica\Query\AbstractQuery;
use Elastica\Query\BoolQuery;

abstract class AbstractTextNodeHandler implements ParsedNodeHandlerInterface {
	public const LANGUAGE_AWARE_FIELDS = [ 'descriptions' ];

	public const LANGUAGE_AGNOSTIC_FIELDS = [
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

	/** @var array */
	protected $languages;

	/** @var array */
	protected $stemmingSettings;

	/** @var array */
	protected $boosts;

	/** @var array */
	protected $decays;

	public function __construct(
		array $languages,
		array $stemmingSettings,
		array $boosts,
		array $decays
	) {
		$this->languages = $languages;
		$this->stemmingSettings = $stemmingSettings;
		$this->boosts = $boosts;
		$this->decays = $decays;
	}

	abstract protected function buildQueryForField( $field, $boost = 0 ): AbstractQuery;

	public function transform(): AbstractQuery {
		$query = new BoolQuery();

		foreach ( static::LANGUAGE_AGNOSTIC_FIELDS as $field ) {
			$boost = $this->boosts[$field] ?? 0;
			$query->addShould( $this->buildQueryForField( $field, $boost * 3 ) );
			$query->addShould( $this->buildQueryForField( "$field.plain", $boost ) );
		}

		foreach ( static::LANGUAGE_AWARE_FIELDS as $field ) {
			foreach ( $this->languages as $index => $language ) {
				// decay x% for each fallback language
				$boost = ( $this->boosts[$field] ?? 0 ) * ( ( $this->decays[$field] ?? 0 ) ** $index );

				if ( $this->stemmingSettings[$language]['query'] ?? false ) {
					$query->addShould( $this->buildQueryForField( "$field.$language", $boost * 3 ) );
				}

				$query->addShould( $this->buildQueryForField( "$field.$language.plain", $boost ) );
			}
		}

		return $query;
	}
}
