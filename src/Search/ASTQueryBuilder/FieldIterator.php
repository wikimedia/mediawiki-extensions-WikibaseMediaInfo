<?php

namespace Wikibase\MediaInfo\Search\ASTQueryBuilder;

use ArrayIterator;

class FieldIterator extends ArrayIterator {
	public const LANGUAGE_AWARE_FIELDS = [
		'descriptions.$language',
		'descriptions.$language.plain',
	];

	public const LANGUAGE_AGNOSTIC_FIELDS = [
		'title',
		'title.plain',
		'category',
		'category.plain',
		'redirect.title',
		'redirect.title.plain',
		'heading',
		'heading.plain',
		'auxiliary_text',
		'auxiliary_text.plain',
		'text',
		'text.plain',
		'file_text',
		'file_text.plain',
		'suggest',
	];

	public const STEMMED_TO_PLAIN_FIELDS_MAP = [
		'descriptions.$language' => 'descriptions.$language.plain',
		'title' => 'title.plain',
		'category' => 'category.plain',
		'redirect.title' => 'redirect.title.plain',
		'heading' => 'heading.plain',
		'auxiliary_text' => 'auxiliary_text.plain',
		'text' => 'text.plain',
		'file_text' => 'file_text.plain',
	];

	public const STEMMED_FIELDS = [
		'descriptions.$language',
		'title',
		'category',
		'redirect.title',
		'heading',
		'auxiliary_text',
		'text',
		'file_text',
	];

	public const PLAIN_FIELDS = [
		'descriptions.$language.plain',
		'title.plain',
		'category.plain',
		'redirect.title.plain',
		'heading.plain',
		'auxiliary_text.plain',
		'text.plain',
		'file_text.plain',
		'suggest',
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
			if ( $boost > 0 ) {
				$queries[] = $this->fieldQueryBuilder->getQuery( $field, $boost );
			}
		}
		return $queries;
	}

	private function getLanguageAwareQueries(): array {
		$queries = [];

		$fields = array_intersect( static::LANGUAGE_AWARE_FIELDS, $this->fields );
		foreach ( $this->languages as $index => $language ) {

			$stemmingEnabledForLanguage = $this->stemmingSettings[$language]['query'] ?? false;

			foreach ( $fields as $field ) {
				// decay x% for each fallback language
				$boost = ( $this->boosts[$field] ?? 0 ) * ( ( $this->decays[$field] ?? 1 ) ** $index );

				if ( $boost > 0 ) {
					if (
						// if stemming is turned on for this language
						$stemmingEnabledForLanguage ||
						// or if this field is not a stemmed field
						!in_array( $field, static::STEMMED_FIELDS )
					) {
						// parse the language into the field name
						$field = str_replace( '$language', $language, $field );
						$queries[] = $this->fieldQueryBuilder->getQuery( $field, $boost );
					} else {
						// Otherwise
						// - this field IS a stemmed field
						// - we do NOT have stemming turned on for this language
						// ... and therefore we cannot query the field.
						// Deal with this by checking if there's a plain equivalent of the stemmed
						// field that has no boost of its own, and if there is then query the plain
						// field instead
						if ( isset( static::STEMMED_TO_PLAIN_FIELDS_MAP[$field] ) ) {
							$plainField = static::STEMMED_TO_PLAIN_FIELDS_MAP[$field];
							$plainBoost =
								( $this->boosts[$plainField] ?? 0 ) *
								( ( $this->decays[$plainField] ?? 1 ) ** $index );
							if ( $plainBoost == 0 ) {
								$plainField = str_replace( '$language', $language, $plainField );
								$queries[] = $this->fieldQueryBuilder->getQuery( $plainField, $boost );
							}
						}
					}
				}
			}
		}
		return $queries;
	}
}
