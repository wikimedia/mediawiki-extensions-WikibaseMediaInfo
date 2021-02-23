<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use ArrayIterator;

class FieldIterator extends ArrayIterator {
	private const LANGUAGE_AWARE_FIELDS = [
		'descriptions'
	];

	private const LANGUAGE_AGNOSTIC_FIELDS = [
		'title',
		'category',
		'redirect.title',
		'suggest',
		'heading',
		'auxiliary_text',
		'text',
		'file_text',
	];

	/** @var fieldQueryBuilderInterface */
	private $fieldQueryBuilder;

	/** @var string[] */
	private $fields;

	/** @var string[] */
	private $languages;

	/** @var array[] */
	private $stemmingSettings;

	/** @var float[] */
	private $boosts;

	/** @var float[] */
	private $decays;

	public function __construct(
		fieldQueryBuilderInterface $fieldQueryBuilder,
		array $fields,
		array $languages,
		array $stemmingSettings,
		array $boosts,
		array $decays
	) {
		$this->fieldQueryBuilder = $fieldQueryBuilder;
		$this->fields = $fields;
		$this->languages = $languages;
		$this->stemmingSettings = $stemmingSettings;
		$this->boosts = $boosts;
		$this->decays = $decays;

		parent::__construct(
			array_merge(
				$this->getLanguageAgnosticQueries(),
				$this->getLanguageAwareQueries()
			)
		);
	}

	private function getLanguageAgnosticQueries(): array {
		$fields = array_intersect( static::LANGUAGE_AGNOSTIC_FIELDS, $this->fields );

		$queries = [];
		foreach ( $fields as $field ) {
			$boost = $this->boosts[$field] ?: 0;
			$queries[] = $this->fieldQueryBuilder->getQuery( $field, $boost * 3 );
			$queries[] = $this->fieldQueryBuilder->getQuery( "$field.plain", $boost );
		}
		return $queries;
	}

	private function getLanguageAwareQueries(): array {
		$fields = array_intersect( static::LANGUAGE_AWARE_FIELDS, $this->fields );

		$queries = [];
		foreach ( $fields as $field ) {
			foreach ( $this->languages as $index => $language ) {
				// decay x% for each fallback language
				$boost = ( $this->boosts[$field] ?? 0 ) * ( ( $this->decays[$field] ?? 1 ) ** $index );

				if ( $this->stemmingSettings[$language]['query'] ?? false ) {
					$queries[] = $this->fieldQueryBuilder->getQuery( "$field.$language", $boost * 3 );
				}

				$queries[] = $this->fieldQueryBuilder->getQuery( "$field.$language.plain", $boost );
			}
		}
		return $queries;
	}
}
