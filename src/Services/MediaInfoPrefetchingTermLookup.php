<?php

namespace Wikibase\MediaInfo\Services;

use Wikibase\DataAccess\PrefetchingTermLookup;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Services\Lookup\TermLookupException;
use Wikibase\DataModel\Term\TermList;
use Wikibase\Lib\Store\EntityRevisionLookup;
use Wikibase\Lib\Store\EntityTermLookupBase;
use Wikibase\MediaInfo\DataModel\MediaInfo;

/**
 * Alternative term lookup for MediaInfo items, who do not require
 * a term index to look up the data.
 */
class MediaInfoPrefetchingTermLookup extends EntityTermLookupBase implements PrefetchingTermLookup {

	private const SUPPORTED_TERM_TYPES = [ 'label', 'description' ];

	/**
	 * @var array
	 */
	private $terms = [];

	public function __construct(
		private readonly EntityRevisionLookup $entityRevisionLookup,
	) {
	}

	/**
	 * Fetch the terms for a specific entity.
	 *
	 * @param EntityId $entityId
	 * @param string[]|null $termTypes The types of terms to return: "label" or  "description".
	 *        If null, all types are prefetched.
	 * @param string[]|null $languageCodes The desired languages, given as language codes.
	 *        If null, all languages are prefetched.
	 */
	private function prefetchTerm( EntityId $entityId, ?array $termTypes = null, ?array $languageCodes = null ) {
		$revision = $this->entityRevisionLookup->getEntityRevision( $entityId );
		if ( !$revision ) {
			// entity does not exist - make term cache unusable
			$this->terms[$entityId->getSerialization()] = false;
			return;
		}

		$entity = $revision->getEntity();
		if ( !$entity instanceof MediaInfo ) {
			$class = get_class( $entity );
			throw new TermLookupException( $entityId, $languageCodes, "Entity of class $class is not supported" );
		}

		$termTypes ??= self::SUPPORTED_TERM_TYPES;

		// init term cache, indicating these entity/term combinations were
		// requested (but might not have been found)
		$this->terms[$entityId->getSerialization()] = array_fill_keys( $termTypes, [] );

		foreach ( $termTypes as $termType ) {
			$termList = match ( $termType ) {
				'label' => $entity->getLabels(),
				'description' => $entity->getDescriptions(),
				// term type not supported, there is no data here
				default => new TermList( [] ),
			};

			$terms = $termList->toTextArray();
			foreach ( $terms as $languageCode => $text ) {
				$this->terms[$entityId->getSerialization()][$termType][$languageCode] = $text;
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	public function prefetchTerms( array $entityIds, array $termTypes, array $languageCodes ) {
		foreach ( $entityIds as $entityId ) {
			$serialization = $entityId->getSerialization();
			if ( isset( $this->terms[$serialization] ) && $this->terms[$serialization] === false ) {
				// entity is already known not to exist
				continue;
			}
			// omit term types that we've already fetched before
			// there's no need to omit (or even check for) existing language codes -
			// they don't matter: if we have the term type, we have it in all languages
			$existingTermTypes = array_keys( $this->terms[$serialization] ?? [] );
			$diffTermTypes = array_diff( $termTypes ?: self::SUPPORTED_TERM_TYPES, $existingTermTypes );
			// if there were no $termTypes to begin with, call prefetchTerm anyway
			// (might be intentional for the side-effect of checking entity existence)
			if ( $diffTermTypes || $termTypes === [] ) {
				$this->prefetchTerm( $entityId, $termTypes, $languageCodes );
			}
		}
	}

	/**
	 * @inheritDoc
	 */
	public function getPrefetchedTerm( EntityId $entityId, $termType, $languageCode ) {
		$serialization = $entityId->getSerialization();
		if ( isset( $this->terms[$serialization] ) && $this->terms[$serialization] === false ) {
			// entity does not exist
			return false;
		}

		if ( !isset( $this->terms[$serialization][$termType] ) ) {
			// term not yet fetched
			return null;
		}

		return $this->terms[$serialization][$termType][$languageCode] ?? false;
	}

	/**
	 * @inheritDoc
	 */
	protected function getTermsOfType( EntityId $entityId, $termType, array $languageCodes ) {
		if ( !isset( $this->terms[$entityId->getSerialization()] ) ) {
			// not yet prefetched
			$this->prefetchTerms( [ $entityId ], [ $termType ], $languageCodes );
		}

		$serialization = $entityId->getSerialization();
		if ( isset( $this->terms[$serialization] ) && $this->terms[$serialization] === false ) {
			throw new TermLookupException( $entityId, $languageCodes, 'The entity could not be loaded' );
		}

		$terms = [];
		foreach ( $languageCodes as $languageCode ) {
			$text = $this->getPrefetchedTerm( $entityId, $termType, $languageCode );

			if ( $text !== null && $text !== false ) {
				$terms[$languageCode] = $text;
			}
		}
		return $terms;
	}

	/** @inheritDoc */
	public function getPrefetchedAliases( EntityId $entityId, $languageCode ) {
		return [];
	}
}
