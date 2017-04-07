<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use PHPUnit_Framework_TestCase;
use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\DescriptionsProviderFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\LabelsProviderFieldDefinitions;

/**
 * @license GPL-2.0+
 * @author Katie Filbert < aude.wiki@gmail.com >
 */
class MediaInfoFieldDefinitionsTest extends PHPUnit_Framework_TestCase {

	public function testGetFields() {
		$languageCodes = [ 'ar', 'de', 'es' ];

		$mediaInfoFieldDefinitions = new MediaInfoFieldDefinitions(
			new LabelsProviderFieldDefinitions( $languageCodes ),
			new DescriptionsProviderFieldDefinitions( $languageCodes )
		);

		$expectedKeys = [
			'label_count',
			'labels',
			'labels_all',
			'statement_count'
		];

		$this->assertSame( $expectedKeys, array_keys( $mediaInfoFieldDefinitions->getFields() ) );
	}

}
