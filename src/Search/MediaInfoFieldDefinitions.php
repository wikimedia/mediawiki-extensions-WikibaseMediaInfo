<?php

namespace Wikibase\MediaInfo\Search;

use Wikibase\Repo\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\FieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\LabelsProviderFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\StatementCountField;

/**
 * @license GPL-2.0+
 * @author Katie Filbert < aude.wiki@gmail.com >
 */
class MediaInfoFieldDefinitions implements FieldDefinitions {

	/**
	 * @var LabelsProviderFieldDefinitions
	 */
	private $labelsProviderFieldDefinitions;

	/**
	 * @var DescriptionsProviderFieldDefinitions
	 */
	private $descriptionsProviderFieldDefinitions;

	/**
	 * @param LabelsProviderFieldDefinitions $labelsProviderFieldDefinitions
	 * @param DescriptionsProviderFieldDefinitions $descriptionsProviderFieldDefinitions
	 */
	public function __construct(
		LabelsProviderFieldDefinitions $labelsProviderFieldDefinitions,
		DescriptionsProviderFieldDefinitions $descriptionsProviderFieldDefinitions
	) {
		$this->labelsProviderFieldDefinitions = $labelsProviderFieldDefinitions;
		$this->descriptionsProviderFieldDefinitions = $descriptionsProviderFieldDefinitions;
	}

	/**
	 * @return SearchIndexField[]
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
