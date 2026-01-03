<?php

namespace Wikibase\MediaInfo\Search;

use Wikibase\Repo\Search\Fields\FieldDefinitions;
use Wikibase\Repo\Search\Fields\WikibaseIndexField;
use Wikibase\Search\Elastic\Fields\StatementCountField;

/**
 * @license GPL-2.0-or-later
 * @author Katie Filbert < aude.wiki@gmail.com >
 */
class MediaInfoFieldDefinitions implements FieldDefinitions {

	public function __construct(
		private readonly FieldDefinitions $labelsProviderFieldDefinitions,
		private readonly FieldDefinitions $descriptionsProviderFieldDefinitions,
		private readonly FieldDefinitions $statementProviderDefinitions,
	) {
	}

	/**
	 * @see FieldDefinitions::getFields
	 *
	 * @return WikibaseIndexField[]
	 */
	public function getFields() {
		$fields = array_merge(
			$this->labelsProviderFieldDefinitions->getFields(),
			$this->descriptionsProviderFieldDefinitions->getFields(),
			$this->statementProviderDefinitions->getFields()
		);

		$fields['statement_count'] = new StatementCountField();

		return $fields;
	}

}
