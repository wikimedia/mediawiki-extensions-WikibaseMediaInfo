<?php

namespace Wikibase\MediaInfo\Search;

use Wikibase\Repo\Search\Elastic\Fields\FieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\StatementCountField;
use Wikibase\Repo\Search\Elastic\Fields\WikibaseIndexField;

/**
 * @license GPL-2.0+
 * @author Katie Filbert < aude.wiki@gmail.com >
 */
class MediaInfoFieldDefinitions implements FieldDefinitions {

	/**
	 * @var FieldDefinitions
	 */
	private $labelsProviderFieldDefinitions;

	/**
	 * @var FieldDefinitions
	 */
	private $descriptionsProviderFieldDefinitions;

	public function __construct(
		FieldDefinitions $labelsProviderFieldDefinitions,
		FieldDefinitions $descriptionsProviderFieldDefinitions
	) {
		$this->labelsProviderFieldDefinitions = $labelsProviderFieldDefinitions;
		$this->descriptionsProviderFieldDefinitions = $descriptionsProviderFieldDefinitions;
	}

	/**
	 * @see FieldDefinitions::getFields
	 *
	 * @return WikibaseIndexField[]
	 */
	public function getFields() {
		$fields = array_merge(
			$this->labelsProviderFieldDefinitions->getFields(),
			$this->descriptionsProviderFieldDefinitions->getFields()
		);

		$fields['statement_count'] = new StatementCountField();

		return $fields;
	}

}
