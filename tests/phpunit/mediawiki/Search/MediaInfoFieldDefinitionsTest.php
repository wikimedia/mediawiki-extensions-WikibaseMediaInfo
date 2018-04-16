<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Search;

use Wikibase\MediaInfo\Search\MediaInfoFieldDefinitions;
use Wikibase\Repo\Search\Elastic\Fields\FieldDefinitions;

/**
 * @license GPL-2.0-or-later
 * @author Katie Filbert < aude.wiki@gmail.com >
 */
class MediaInfoFieldDefinitionsTest extends \PHPUnit\Framework\TestCase {

	public function testGetFields() {
		$labelsProviderFieldDefinitions = $this->getMock( FieldDefinitions::class );
		$labelsProviderFieldDefinitions->method( 'getFields' )
			->willReturn( [
				'test_only_labels' => null,
			] );

		$descriptionsProviderFieldDefinitions = $this->getMock( FieldDefinitions::class );
		$descriptionsProviderFieldDefinitions->method( 'getFields' )
			->willReturn( [
				'test_only_descriptions' => null,
			] );

		$statementProviderFieldDefinitions = $this->getMock( FieldDefinitions::class );
		$statementProviderFieldDefinitions->method( 'getFields' )
			->willReturn( [
				'test_only_statements' => null,
			] );

		$mediaInfoFieldDefinitions = new MediaInfoFieldDefinitions(
			$labelsProviderFieldDefinitions,
			$descriptionsProviderFieldDefinitions,
			$statementProviderFieldDefinitions
		);

		$expectedKeys = [
			'test_only_labels',
			'test_only_descriptions',
			'test_only_statements',
			'statement_count'
		];

		$this->assertSame( $expectedKeys, array_keys( $mediaInfoFieldDefinitions->getFields() ) );
	}

}
