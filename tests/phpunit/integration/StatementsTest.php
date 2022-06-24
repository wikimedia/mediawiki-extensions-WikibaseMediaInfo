<?php

namespace Wikibase\MediaInfo\Tests\Integration;

use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\Repo\WikibaseRepo;
use Wikimedia\Assert\Assert;

/**
 * What's tested:
 * - add a claim with valid item
 * - edit an existing claim prominence
 * - delete an existing claim
 * - get all existing claims for entity
 * - search/lookup statement (just that the search works without falling over, results not tested)
 * - clear entity, deleting all statements
 *
 * @group medium
 * @group upload
 * @group Database
 * @coversNothing
 */
class StatementsTest extends WBMIApiTestCase {

	private $stashedWikibaseSettings;

	private function restoreFederation() {
		global $wgWBRepoSettings;
		if ( is_array( $this->stashedWikibaseSettings ) ) {
			$wgWBRepoSettings = $this->stashedWikibaseSettings;
		}
	}

	private function turnOffFederation() {
		global $wgWBRepoSettings;
		$this->stashedWikibaseSettings = $wgWBRepoSettings;

		$wgWBRepoSettings['foreignRepositories'] = [];
		$wgWBRepoSettings['useEntitySourceBasedFederation'] = false;

		$wgWBRepoSettings['entityNamespaces']['item'] = WB_NS_ITEM;
		$wgWBRepoSettings['entityNamespaces']['property'] = WB_NS_PROPERTY;
	}

	private function createTestEntity( $type = 'item' ) {
		Assert::parameter(
			in_array( $type, [ 'item', 'property' ] ),
			'type',
			'must be "item" or "property"'
		);
		$data = [
			'labels' => [
				[
					'language' => 'en',
					'value' => 'TEST_' . strtoupper( $type ) . '_' . uniqid()
				]
			]
		];
		if ( $type === 'property' ) {
			$data['datatype'] = 'wikibase-item';
		}
		$params = [
			'action' => 'wbeditentity',
			"new" => $type,
			"data" => json_encode( $data ),
		];
		list( $result, , ) = $this->doApiRequestWithToken(
			$params,
			null,
			self::$users['uploader']->getUser()
		);
		return $result['entity']['id'];
	}

	private function createTestClaim( $entityId, $propertyId, $itemId ) {
		$claim = [
			'type' => 'statement',
			'mainsnak' => [
				'snaktype' => 'value',
				'property' => $propertyId,
				'datavalue' => [
					'type' => 'wikibase-entityid',
					'value' => [ 'id' => $itemId ]
				],
			],
			'id' => $entityId . '$' . $this->generateUuidV4(),
			'rank' => 'normal'
		];
		return $claim;
	}

	private function generateUuidV4() {
		return sprintf(
			'%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0x0fff ) | 0x4000,
			mt_rand( 0, 0x3fff ) | 0x8000,
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff ),
			mt_rand( 0, 0xffff )
		);
	}

	private function compareStatements( $statement1, $statement2 ) {
		if ( $statement1['id'] !== $statement2['id'] ) {
			return false;
		}
		if ( $statement1['rank'] !== $statement2['rank'] ) {
			return false;
		}
		if ( $statement1['mainsnak']['snaktype'] !== $statement2['mainsnak']['snaktype'] ) {
			return false;
		}
		if (
			$statement1['mainsnak']['datavalue']['type'] !==
			$statement2['mainsnak']['datavalue']['type']
		) {
			return false;
		}
		if ( $statement1['mainsnak']['datavalue']['type'] === 'wikibase-entityid' ) {
			if (
				$statement1['mainsnak']['datavalue']['value']['id'] !==
				$statement2['mainsnak']['datavalue']['value']['id']
			) {
				return false;
			}
		}
		return true;
	}

	private function setStatement( $claim ) {
		$params = [
			'action' => 'wbsetclaim',
			'bot' => 1,
			'claim' => json_encode( $claim ),
			'format' => 'json',
		];
		$this->doApiRequestWithToken(
			$params,
			null,
			self::$users['wbeditor']->getUser()
		);
	}

	private function entityHasStatement( $entityId, $testStatement ) {
		list( $result, , ) = $this->doApiRequestWithToken(
			[
				'action' => 'wbgetentities',
				'ids' => $entityId,
				'props' => 'claims'
			],
			null,
			self::$users['wbeditor']->getUser()
		);
		$statements = $result['entities'][$entityId]['statements'];

		$testPropertyId = $testStatement['mainsnak']['property'];
		if ( !array_key_exists( $testPropertyId, $statements ) ) {
			return false;
		}

		$statementOk = false;
		foreach ( $statements[$testPropertyId] as $statement ) {
			if (
				$statement['id'] === $testStatement['id'] &&
				$this->compareStatements( $statement, $testStatement )
			) {
				$statementOk = true;
			}
		}
		return $statementOk;
	}

	public function testEditStatements() {
		$this->turnOffFederation();

		$testFilePage = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle(
			\Title::newFromText( $this->uploadRandomImage() )
		);

		$pageId = $testFilePage->getId();
		$entityIdComposer = WikibaseRepo::getEntityIdComposer();
		$entityId = $entityIdComposer->composeEntityId(
			'',
			MediaInfo::ENTITY_TYPE,
			$pageId
		)->getSerialization();

		$testPropertyId = $this->createTestEntity( 'property' );

		// Add a statement
		$testClaim_1 = $this->createTestClaim(
			$entityId,
			$testPropertyId,
			$this->createTestEntity( 'item' )
		);
		$this->setStatement( $testClaim_1 );

		// Add another statement
		$testClaim_2 = $this->createTestClaim(
			$entityId,
			$testPropertyId,
			$this->createTestEntity( 'item' )
		);
		$this->setStatement( $testClaim_2 );

		// Check statements were added ok
		$this->assertTrue(
			$this->entityHasStatement( $entityId, $testClaim_1 )
		);
		$this->assertTrue(
			$this->entityHasStatement( $entityId, $testClaim_2 )
		);

		// Change rank of statement 1 and then check the rank is changed on read
		$testClaim_1['rank'] = 'preferred';
		$this->setStatement( $testClaim_1 );
		$this->assertTrue(
			$this->entityHasStatement( $entityId, $testClaim_1 )
		);

		// Remove statement 2 and check it is no longer in the entity
		$this->doApiRequestWithToken(
			[
				'action' => 'wbremoveclaims',
				'claim' => $testClaim_2['id'],
			],
			null,
			self::$users['wbeditor']->getUser()
		);
		$this->assertFalse(
			$this->entityHasStatement( $entityId, $testClaim_2 )
		);

		// Search for statements
		// NOTE: we don't expect this to return results, as search depends on a Cirrus job.
		// Just do an API call to make sure that there isn't a fatal
		$this->doApiRequestWithToken(
			[
				'action' => 'query',
				'list' => 'search',
				'srsearch' => 'haswbstatement:' . $testPropertyId
			],
			null,
			self::$users['wbeditor']->getUser()
		);

		// Clear entity and check that statement 1 is also gone
		$this->doApiRequestWithToken(
			[
				'action' => 'wbeditentity',
				'id' => $entityId,
				'data' => '{}',
				'clear' => true,
			],
			null,
			self::$users['wbeditor']->getUser()
		);
		$this->assertFalse(
			$this->entityHasStatement( $entityId, $testClaim_1 )
		);

		$this->restoreFederation();
	}

	public function testCanAddStatementToEmptyMediainfoRecordWhenSpecifyingBaseRevId() {
		$this->turnOffFederation();

		$filePage = $this->getServiceContainer()->getWikiPageFactory()
			->newFromTitle( \Title::newFromText( $this->uploadRandomImage() ) );

		$pageId = $filePage->getId();
		$revId = $filePage->getRevisionRecord()->getId();
		$mediainfoId = 'M' . $pageId;

		$propertyId = $this->createTestEntity( 'property' );
		$itemId = $this->createTestEntity( 'item' );

		$statement = $this->createTestClaim( $mediainfoId, $propertyId, $itemId );

		$this->doApiRequestWithToken(
			[
				'action' => 'wbsetclaim',
				'baserevid' => $revId,
				'claim' => json_encode( $statement ),
				'format' => 'json',
			],
			null,
			self::$users['wbeditor']->getUser()
		);

		$this->assertTrue( $this->entityHasStatement( $mediainfoId, $statement ) );

		$this->restoreFederation();
	}

}
