<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\Services;

use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Services\Lookup\TermLookupException;
use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermList;
use Wikibase\Lib\Store\EntityRevision;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\DataModel\MediaInfoId;
use Wikibase\MediaInfo\Services\MediaInfoPrefetchingTermLookup;

/**
 * @covers \Wikibase\MediaInfo\Services\MediaInfoPrefetchingTermLookup
 *
 * @group WikibaseMediaInfo
 */
class MediaInfoPrefetchingTermLookupTest extends \PHPUnit\Framework\TestCase {

	/**
	 * @var MediaInfoId
	 */
	protected static $defaultRevisionId;

	/**
	 * @var MediaInfoId
	 */
	protected static $nonExistingRevisionId;

	public static function setUpBeforeClass(): void {
		static::$defaultRevisionId = new MediaInfoId( 'M1' );
		static::$nonExistingRevisionId = new MediaInfoId( 'M99' );
	}

	/**
	 * @param EntityRevision[] $revisions
	 * @return EntityRevisionLookup
	 */
	protected function mockEntityRevisionLookup( array $revisions ) {
		$map = [];
		foreach ( $revisions as $revision ) {
			$map[$revision->getEntity()->getId()->getSerialization()] = $revision;
		}

		$mock = $this->createMock( EntityRevisionLookup::class );
		$mock->method( 'getEntityRevision' )->willReturnCallback(
			static function ( EntityId $entityId ) use ( $map ) {
				return $map[$entityId->getSerialization()] ?? null;
			}
		);

		return $mock;
	}

	/**
	 * @return MediaInfoPrefetchingTermLookup
	 */
	protected function getDefaultMediaInfoPrefetchingTermLookup() {
		return new MediaInfoPrefetchingTermLookup( $this->mockEntityRevisionLookup(
			[
				new EntityRevision(
					new MediaInfo(
						static::$defaultRevisionId,
						new TermList( [
							new Term( 'en', 'This is a label' ),
							new Term( 'nl', 'Dit is een label' ),
							new Term( 'fr', 'Ceci est un libellé' ),
							new Term( 'de', 'Das ist eine Bezeichnung' ),
						] ),
						new TermList( [
							new Term( 'en', 'This is a description' ),
							new Term( 'nl', 'Dit is een beschrijving' ),
							new Term( 'fr', 'Ceci est une description' ),
							new Term( 'de', 'Das ist eine Beschreibung' ),
						] )
					)
				)
			]
		) );
	}

	public function testGetPrefetchedWithoutPrefetch() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();

		$this->assertNull(
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'label', 'en' )
		);
		$this->assertNull(
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'description', 'nl' )
		);
	}

	public function testGetPrefetched() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'label', 'description' ],
			[ 'en', 'nl' ]
		);

		$this->assertSame(
			'This is a label',
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'label', 'en' )
		);
		$this->assertSame(
			'Dit is een beschrijving',
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'description', 'nl' )
		);
	}

	public function testGetPrefetchedNonExistingEntity() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$nonExistingRevisionId ],
			[ 'label', 'description' ],
			[ 'en', 'nl' ]
		);

		$this->assertFalse(
			$termLookup->getPrefetchedTerm( static::$nonExistingRevisionId, 'label', 'en' )
		);
		$this->assertFalse(
			$termLookup->getPrefetchedTerm( static::$nonExistingRevisionId, 'description', 'nl' )
		);
	}

	public function testGetPrefetchedNonSupportedTermType() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			// alias is not supported
			[ 'label', 'description', 'alias' ],
			[ 'en', 'nl' ]
		);

		$this->assertSame(
			'This is a label',
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'label', 'en' )
		);
		$this->assertSame(
			'Dit is een beschrijving',
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'description', 'nl' )
		);
	}

	public function testGetPrefetchedUnfetchedTerm() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms( [ static::$defaultRevisionId ], [ 'label' ], [ 'qqq' ] );

		// we didn't explicitly fetch this term, so it may or may not exist...
		// all we know is that we don't want to get a `false` (does not exist)
		// result, because we just don't know...
		$this->assertNotFalse(
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'description', 'qqq' )
		);
	}

	public function testGetPrefetchedNonExistingLanguage() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms( [ static::$defaultRevisionId ], [ 'label', 'description' ], [ 'qqq' ] );

		$this->assertFalse(
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'label', 'qqq' )
		);
		$this->assertFalse(
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'description', 'qqq' )
		);
	}

	public function testGetPrefetchedUnfetchedLanguage() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'label', 'description' ],
			[ 'en' ]
		);

		// we didn't explicitly fetch this language, so it may or may not exist...
		// all we know is that we don't want to get a `false` (does not exist)
		// result, because we just don't know...
		$this->assertNotFalse(
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'label', 'fr' )
		);
		$this->assertNotFalse(
			$termLookup->getPrefetchedTerm( static::$defaultRevisionId, 'description', 'fr' )
		);
	}

	public function testGetLabelWithoutPrefetch() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();

		// will prefetch implicitly
		$this->assertSame(
			'This is a label',
			$termLookup->getLabel( static::$defaultRevisionId, 'en' )
		);
	}

	public function testGetLabel() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'label' ],
			[ 'en' ]
		);

		$this->assertSame(
			'This is a label',
			$termLookup->getLabel( static::$defaultRevisionId, 'en' )
		);
	}

	public function testGetLabelNonExistingEntity() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$nonExistingRevisionId ],
			[ 'label' ],
			[ 'en' ]
		);

		$this->expectException( TermLookupException::class );
		$termLookup->getLabel( static::$nonExistingRevisionId, 'en' );
	}

	public function testGetLabelNonExistingLanguage() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'label' ],
			[ 'qqq' ]
		);

		$this->assertNull(
			$termLookup->getLabel( static::$defaultRevisionId, 'qqq' )
		);
	}

	public function testGetLabelsWithoutPrefetch() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();

		// will prefetch implicitly
		$this->assertSame(
			[
				'en' => 'This is a label',
				'nl' => 'Dit is een label',
			],
			$termLookup->getLabels( static::$defaultRevisionId, [ 'en', 'nl' ] )
		);
	}

	public function testGetLabels() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'label' ],
			[ 'en', 'nl' ]
		);

		$this->assertSame(
			[
				'en' => 'This is a label',
				'nl' => 'Dit is een label',
			],
			$termLookup->getLabels( static::$defaultRevisionId, [ 'en', 'nl' ] )
		);
	}

	public function testGetLabelsNonExistingEntity() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$nonExistingRevisionId ],
			[ 'label' ],
			[ 'en', 'nl' ]
		);

		$this->expectException( TermLookupException::class );
		$termLookup->getLabels( static::$nonExistingRevisionId, [ 'en', 'nl' ] );
	}

	public function testGetLabelsNonExistingLanguage() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'label', 'description' ],
			[ 'en', 'qqq' ]
		);

		$this->assertSame(
			[
				'en' => 'This is a label',
			],
			$termLookup->getLabels( static::$defaultRevisionId, [ 'en', 'qqq' ] )
		);
	}

	public function testGetDescriptionWithoutPrefetch() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();

		// will prefetch implicitly
		$this->assertSame(
			'This is a description',
			$termLookup->getDescription( static::$defaultRevisionId, 'en' )
		);
	}

	public function testGetDescription() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms( [ static::$defaultRevisionId ], [ 'description' ], [ 'en' ] );

		$this->assertSame(
			'This is a description',
			$termLookup->getDescription( static::$defaultRevisionId, 'en' )
		);
	}

	public function testGetDescriptionNonExistingEntity() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$nonExistingRevisionId ],
			[ 'description' ],
			[ 'en' ]
		);

		$this->expectException( TermLookupException::class );
		$termLookup->getDescription( static::$nonExistingRevisionId, 'en' );
	}

	public function testGetDescriptionNonExistingLanguage() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'description' ],
			[ 'qqq' ]
		);

		$this->assertNull(
			$termLookup->getDescription( static::$defaultRevisionId, 'qqq' )
		);
	}

	public function testGetDescriptionsWithoutPrefetch() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();

		// will prefetch implicitly
		$this->assertSame(
			[
				'en' => 'This is a description',
				'nl' => 'Dit is een beschrijving',
			],
			$termLookup->getDescriptions( static::$defaultRevisionId, [ 'en', 'nl' ] )
		);
	}

	public function testGetDescriptions() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'description' ],
			[ 'en', 'nl' ]
		);

		$this->assertSame(
			[
				'en' => 'This is a description',
				'nl' => 'Dit is een beschrijving',
			],
			$termLookup->getDescriptions( static::$defaultRevisionId, [ 'en', 'nl' ] )
		);
	}

	public function testGetDescriptionsNonExistingEntity() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$nonExistingRevisionId ],
			[ 'description' ],
			[ 'en', 'nl' ]
		);

		$this->expectException( TermLookupException::class );
		$termLookup->getDescriptions( static::$nonExistingRevisionId, [ 'en', 'nl' ] );
	}

	public function testGetDescriptionsNonExistingLanguage() {
		$termLookup = $this->getDefaultMediaInfoPrefetchingTermLookup();
		$termLookup->prefetchTerms(
			[ static::$defaultRevisionId ],
			[ 'description' ],
			[ 'en', 'qqq' ]
		);

		$this->assertSame(
			[
				'en' => 'This is a description',
			],
			$termLookup->getDescriptions( static::$defaultRevisionId, [ 'en', 'qqq' ] )
		);
	}

}
