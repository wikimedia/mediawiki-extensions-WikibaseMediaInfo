<?php

namespace Wikibase\MediaInfo\Api;

use ApiBase;
use ApiMain;
use MediaWiki\Http\HttpRequestFactory;
use ValueFormatters\FormatterOptions;
use ValueFormatters\ValueFormatter;
use Wikibase\DataModel\DeserializerFactory;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\Item;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\Lib\Formatters\OutputFormatSnakFormatterFactory;
use Wikibase\Lib\Formatters\SnakFormatter;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\ParamValidator\TypeDef\IntegerDef;

/**
 * This endpoint returns data for related concepts for a search term.
 */
class ApiRelatedConcepts extends ApiBase {

	/** @var HttpRequestFactory */
	private $httpRequestFactory;

	/** @var string */
	private $externalEntitySearchBaseUri;

	/** @var array */
	private $heuristics;

	/** @var DeserializerFactory */
	private $deserializerFactory;

	/** @var OutputFormatSnakFormatterFactory */
	private $snakFormatterFactory;

	/**
	 * @param ApiMain $main
	 * @param string $moduleName
	 * @param HttpRequestFactory $httpRequestFactory
	 * @param DeserializerFactory $deserializerFactory
	 * @param OutputFormatSnakFormatterFactory $snakFormatterFactory
	 * @param string $externalEntitySearchBaseUri
	 * @param array $heuristics
	 */
	public function __construct(
		ApiMain $main,
		$moduleName,
		HttpRequestFactory $httpRequestFactory,
		DeserializerFactory $deserializerFactory,
		OutputFormatSnakFormatterFactory $snakFormatterFactory,
		$externalEntitySearchBaseUri,
		array $heuristics = []
	) {
		parent::__construct( $main, $moduleName );
		$this->httpRequestFactory = $httpRequestFactory;
		$this->deserializerFactory = $deserializerFactory;
		$this->snakFormatterFactory = $snakFormatterFactory;
		$this->externalEntitySearchBaseUri = $externalEntitySearchBaseUri;
		$this->heuristics = $heuristics;
	}

	/**
	 * @param ApiMain $main
	 * @param string $moduleName
	 * @param HttpRequestFactory $httpRequestFactory
	 * @param DeserializerFactory $deserializerFactory
	 * @param OutputFormatSnakFormatterFactory $snakFormatterFactory
	 * @return self
	 */
	public static function factory(
		ApiMain $main,
		$moduleName,
		HttpRequestFactory $httpRequestFactory,
		DeserializerFactory $deserializerFactory,
		OutputFormatSnakFormatterFactory $snakFormatterFactory
	) {
		$config = $main->getConfig();

		return new self(
			$main,
			$moduleName,
			$httpRequestFactory,
			$deserializerFactory,
			$snakFormatterFactory,
			$config->get( 'MediaInfoExternalEntitySearchBaseUri' ),
			$config->get( 'MediaInfoMediaSearchConceptChipsSimpleHeuristics' )
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$params = $this->extractRequestParams();

		// Get wikidata item(s) that match the search term.
		$matchingWikibaseItemIds = $this->findMatchingEntityIds( $params['term'], 3 );
		$matchingWikibaseItems = $this->getEntities( $matchingWikibaseItemIds );
		if ( count( $matchingWikibaseItems ) === 0 ) {
			return;
		}

		$related = $this->getTermsRelatedToWikibaseItems( $matchingWikibaseItems, $params['limit'] );
		$related = array_filter( $related, function ( $term ) use ( $params ) {
			return strtolower( $term ) !== strtolower( $params['term'] );
		} );

		$this->getResult()->addValue( 'query', 'relatedconcepts', array_values( $related ) );
	}

	public function findMatchingEntityIds( string $term, int $limit = 10 ): array {
		$response = $this->apiRequest( [
			'format' => 'json',
			'action' => 'query',
			'list' => 'search',
			'srsearch' => $term,
			'srnamespace' => 0,
			// 50 pages is limit for next api call, so asking more makes no sense
			'srlimit' => min( 50, $limit ),
			'srqiprofile' => 'wikibase',
			'uselang' => $this->getLanguage()->getCode(),
		] );
		return array_column( $response['query']['search'] ?? [], 'title' );
	}

	public function getEntities( array $entityIds ): array {
		if ( count( $entityIds ) === 0 ) {
			return [];
		}

		$response = $this->apiRequest( [
			'format' => 'json',
			'action' => 'wbgetentities',
			'ids' => implode( '|', $entityIds ),
			'uselang' => $this->getLanguage()->getCode(),
		] );

		$itemDeserializer = $this->deserializerFactory->newItemDeserializer();
		return array_map( [ $itemDeserializer, 'deserialize' ], $response['entities'] ?? [] );
	}

	/**
	 * Returns a number of terms related to wikidata entities, according
	 * to a preconfigured array of heuristics.
	 *
	 * @param array $entities
	 * @param int $limit
	 * @return array
	 */
	private function getTermsRelatedToWikibaseItems( array $entities, int $limit = 10 ): array {
		$language = $this->getLanguage()->getCode();

		$snaks = [];
		foreach ( $entities as $entity ) {
			// figure out which - if any - properties of the given entity we care about
			$properties = $this->evaluateHeuristics( $entity, $this->heuristics );

			// fetch all relevant (per property ids defined in heuristics)
			// PropertyValueSnak for these entities
			$statements = $entity->getStatements();
			foreach ( $properties as $property ) {
				$statement = $statements->getByPropertyId( new PropertyId( $property ) );
				foreach ( $statement->getMainSnaks() as $snak ) {
					if ( $snak instanceof PropertyValueSnak ) {
						$snaks[] = $snak;
					}
				}
			}
		}

		// format all snaks in relevant language
		$formatter = $this->snakFormatterFactory->getSnakFormatter(
			SnakFormatter::FORMAT_PLAIN,
			new FormatterOptions( [ ValueFormatter::OPT_LANG => $language ] )
		);
		$results = array_map( [ $formatter, 'formatSnak' ], $snaks );

		return array_unique( $results );
	}

	/**
	 * This will parse the must/should/must not/should not directives in the
	 * heuristics array (recursively) and combine all matching results into
	 * the return value array.
	 *
	 * @param Item $entity
	 * @param array $heuristics
	 * @return array
	 */
	public function evaluateHeuristics( Item $entity, array $heuristics ): array {
		$makeCondition = function ( array $condition ) use ( $entity ) {
			$propertyId = new PropertyId( $condition['property'] );
			$itemId = isset( $condition['item'] ) ? new ItemId( $condition['item'] ) : null;
			return $this->hasStatement( $entity, $propertyId, $itemId );
		};

		$result = [];

		foreach ( $heuristics as $heuristic ) {
			$heuristic += [
				// must = all conditions must be true
				'must' => [],
				// should = at least one condition must be true
				'should' => [],
				// must not = all conditions must be false
				'must not' => [],
				// should not = at least one condition must be false
				'should not' => [],
				// additional (nested) conditions
				'conditions' => [],
				// queries to add
				'result' => [],
			];

			foreach ( $heuristic['must'] as $must ) {
				if ( !$makeCondition( $must ) ) {
					continue 2;
				}
			}

			$matched = count( $heuristic['should'] ) === 0;
			foreach ( $heuristic['should'] as $should ) {
				if ( $makeCondition( $should ) ) {
					$matched = true;
					break;
				}
			}
			if ( !$matched ) {
				continue;
			}

			foreach ( $heuristic['must not'] as $must ) {
				if ( $makeCondition( $must ) ) {
					continue 2;
				}
			}

			$matched = count( $heuristic['should not'] ) === 0;
			foreach ( $heuristic['should not'] as $should ) {
				if ( !$makeCondition( $should ) ) {
					$matched = true;
					break;
				}
			}
			if ( !$matched ) {
				continue;
			}

			if ( isset( $heuristic['result'] ) ) {
				$result = array_merge( $result, $heuristic['result'] );
			}

			if ( isset( $heuristic['conditions'] ) ) {
				$result = array_merge( $result, $this->evaluateHeuristics( $entity, $heuristic['conditions'] ) );
			}
		}

		return $result;
	}

	private function hasStatement( Item $entity, PropertyId $propertyId, ItemId $itemId = null ): bool {
		$statements = $entity->getStatements();
		$statementsForProperty = $statements->getByPropertyId( $propertyId );
		if ( $itemId === null && count( $statementsForProperty ) > 0 ) {
			return true;
		}

		$snaks = $statementsForProperty->getMainSnaks();
		foreach ( $snaks as $snak ) {
			if ( !( $snak instanceof PropertyValueSnak ) ) {
				continue;
			}

			$dataValue = $snak->getDataValue();
			if ( !( $dataValue instanceof EntityIdValue ) ) {
				continue;
			}

			if ( $dataValue->getEntityId()->equals( $itemId ) ) {
				return true;
			}
		}

		return false;
	}

	private function apiRequest( array $params ) : array {
		$url = $this->externalEntitySearchBaseUri . '?' . http_build_query( $params );
		$request = $this->httpRequestFactory->create( $url, [], __METHOD__ );
		$request->execute();
		$data = $request->getContent();

		return json_decode( $data, true ) ?: [];
	}

	/**
	 * @inheritDoc
	 */
	protected function getAllowedParams() {
		return [
			'term' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'limit' => [
				ParamValidator::PARAM_TYPE => 'limit',
				ParamValidator::PARAM_DEFAULT => 10,
				IntegerDef::PARAM_MIN => 1,
				IntegerDef::PARAM_MAX => 100,
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	protected function getExamplesMessages() {
		return [
			'action=relatedconcepts&term=apple' => 'apihelp-relatedconcepts-example',
		];
	}

	/**
	 * @inheritDoc
	 */
	public function getHelpUrls() {
		return [
			// At this point, usage of this API should be limited only to the
			// experimental media search concept chips feature & its future
			// implementation will likely change drastically.
			// There is no point in providing help for something for which usage
			// is discouraged.
		];
	}

}
