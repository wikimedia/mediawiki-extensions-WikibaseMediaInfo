<?php

namespace Wikibase\MediaInfo\View;

use DataValues\DataValue;
use DataValues\Serializers\DataValueSerializer;
use Html;
use OOUI\HtmlSnippet;
use OOUI\PanelLayout;
use OOUI\Tag;
use OutputPage;
use ValueFormatters\FormatterOptions;
use ValueFormatters\ValueFormatter;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\DataModel\Snak\Snak;
use Wikibase\DataModel\Snak\SnakList;
use Wikibase\DataModel\Snak\SnakObject;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\Lib\Formatters\OutputFormatSnakFormatterFactory;
use Wikibase\Lib\Formatters\OutputFormatValueFormatterFactory;
use Wikibase\Lib\Formatters\SnakFormatter;
use Wikibase\Lib\Store\PropertyOrderProvider;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\LocalizedTextProvider;

/**
 * Generates HTML to display the statements of a MediaInfo entity
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityStatementsView {

	private $propertyOrderProvider;
	private $textProvider;
	private $defaultPropertyIds;
	private $snakFormatterFactory;
	private $valueFormatterFactory;
	private $serializerFactory;
	private $languageCode;
	private $properties;

	const STATEMENTS_CUSTOM_TAG = 'mediaInfoViewStatements';

	/**
	 * @param PropertyOrderProvider $propertyOrderProvider
	 * @param LocalizedTextProvider $textProvider
	 * @param PropertyId[] $defaultPropertyIds Default values are displayed for these properties if
	 * 	we don't have values for them
	 * @param OutputFormatSnakFormatterFactory $snakFormatterFactory
	 * @param OutputFormatValueFormatterFactory $valueFormatterFactory
	 * @param SerializerFactory $serializerFactory
	 * @param string $languageCode
	 * @param string[] $properties Array of property IDs
	 */
	public function __construct(
		PropertyOrderProvider $propertyOrderProvider,
		LocalizedTextProvider $textProvider,
		array $defaultPropertyIds,
		OutputFormatSnakFormatterFactory $snakFormatterFactory,
		OutputFormatValueFormatterFactory $valueFormatterFactory,
		SerializerFactory $serializerFactory,
		$languageCode,
		$properties
	) {
		OutputPage::setupOOUI();

		$this->propertyOrderProvider = $propertyOrderProvider;
		$this->textProvider = $textProvider;
		$this->defaultPropertyIds = $defaultPropertyIds;
		$this->snakFormatterFactory = $snakFormatterFactory;
		$this->valueFormatterFactory = $valueFormatterFactory;
		$this->serializerFactory = $serializerFactory;
		$this->languageCode = $languageCode;
		$this->properties = $properties;
	}

	/**
	 * @param MediaInfo $entity
	 * @return string
	 */
	public function getHtml( MediaInfo $entity ) {
		$statements = $this->statementsByPropertyId( $entity->getStatements() );

		$html = '';
		foreach ( $statements as $propertyId => $statementArray ) {
			$panel = $this->getLayoutForProperty( $propertyId, $statementArray );
			$html .= $panel->toString();
		}

		// Wrap the whole thing in a custom tag so we can manipulate its position on the page
		// later on
		return Html::rawElement(
			self::STATEMENTS_CUSTOM_TAG,
			[],
			$html
		);
	}

	public static function getHtmlContainerClass( $propertyIdString ) {
		return 'wbmi-entityview-statementsGroup-' . str_replace( ':', '_', $propertyIdString );
	}

	/**
	 * @param Statement $statement
	 * @return array
	 */
	private function getStatementFormatValueCache( Statement $statement ) {
		$results = [];

		$results += $this->getSnakFormatValueCache( $statement->getMainSnak() );

		foreach ( $statement->getQualifiers() as $qualifier ) {
			$results += $this->getSnakFormatValueCache( $qualifier );
		}

		return $results;
	}

	/**
	 * @param Snak $snak
	 * @return array
	 */
	private function getSnakFormatValueCache( Snak $snak ) {
		$result = [];

		// format property
		if ( $snak instanceof SnakObject ) {
			$dataValue = new EntityIdValue( $snak->getPropertyId() );
			$result += $this->getValueFormatValueCache(
				$dataValue,
				[
					SnakFormatter::FORMAT_HTML,
					SnakFormatter::FORMAT_PLAIN,
				]
			);
		}

		// format value
		if ( $snak instanceof PropertyValueSnak ) {
			$serializer = new DataValueSerializer();
			$serialized = $serializer->serialize( $snak->getDataValue() );

			$data = json_encode( $serialized );
			$property = $snak->getPropertyId()->getSerialization();
			$formatted = $this->formatSnak( $snak, SnakFormatter::FORMAT_HTML );

			$result[$data][SnakFormatter::FORMAT_HTML][$this->languageCode][$property] = $formatted;
		}

		return $result;
	}

	/**
	 * @param DataValue $value
	 * @param string[] $formats
	 * @return array
	 */
	private function getValueFormatValueCache( DataValue $value, $formats = [ SnakFormatter::FORMAT_PLAIN ] ) {
		$result = [];

		$serializer = new DataValueSerializer();
		$serialized = $serializer->serialize( $value );

		$data = json_encode( $serialized );
		foreach ( $formats as $format ) {
			$result[$data][$format][$this->languageCode][''] = $this->formatValue( $value, $format );
		}

		return $result;
	}

	/**
	 * @param string $propertyIdString
	 * @param Statement[] $statements
	 * @return PanelLayout
	 */
	private function getLayoutForProperty( $propertyIdString, array $statements ) {
		$statementSerializer = $this->serializerFactory->newStatementSerializer();

		$serializedStatements = [];
		$formatValueCache = [];

		$itemsGroupDiv = new Tag( 'div' );
		$itemsGroupDiv->addClasses( [ 'wbmi-content-items-group' ] );
		foreach ( $statements as $statement ) {
			$itemsGroupDiv->appendContent( $this->createStatementDiv( $statement ) );
			$serializedStatements[] = $statementSerializer->serialize( $statement );
			$formatValueCache += $this->getStatementFormatValueCache( $statement );
		}

		// format main property (e.g. depicts)
		$formatValueCache += $this->getValueFormatValueCache(
			new EntityIdValue( $statement->getPropertyId() ),
			[ SnakFormatter::FORMAT_HTML ]
		);

		/*
		 * Here's quite an odd way to render a title...
		 * We want to keep this place mostly generic, so that it doesn't
		 * really matter what property we're dealing with. `Depicts` (or
		 * any other) is not different from the next.
		 * However, it looks like we (may) want to have specific titles
		 * (https://phabricator.wikimedia.org/T216757 asks for one for
		 * depicts on commons)
		 * Instead of hardcoding this, let's just see if a message exist
		 * that uses the descriptive name that was used for the property
		 * ID in extension.json: for a property { depicts: P1 }, we'll
		 * see if we can find an image with i18n key
		 * wikibasemediainfo-statements-title-depicts, and if so, display
		 * a title. If not, no title... This allows any wiki to set up
		 * any property/statement group with any title, or none at all.
		 */
		$title = '';
		$name = array_search( $propertyIdString, $this->properties );
		// possible messages include:
		// wikibasemediainfo-statements-title-depicts
		$message = wfMessage( 'wikibasemediainfo-statements-title-' . ( $name ?: '' ) );
		if ( $name !== false && $message->exists() ) {
			$title = new Tag( 'h3' );
			$title->addClasses( [ 'wbmi-statements-title' ] );
			$title->appendContent( $message->text() );
		}

		$panelClasses = [
			'wbmi-entityview-statementsGroup',
			self::getHtmlContainerClass( $propertyIdString ),
		];

		$panel = new PanelLayout( [
			'classes' => $panelClasses,
			'scrollable' => false,
			'padded' => false,
			'expanded' => false,
			'framed' => true,
			'content' => [
				( new Tag( 'div' ) )
					->addClasses( [ 'wbmi-statements-widget' ] )
					->appendContent(
						$title,
						$this->createPropertyHeader( $propertyIdString ),
						$itemsGroupDiv
					),
			]
		] );
		$panel->setAttributes(
			[
				'data-property' => $propertyIdString,
				'data-statements' => json_encode( $serializedStatements ),
				'data-formatvalue' => json_encode( $formatValueCache ),
			]
		);
		return $panel;
	}

	private function createPropertyHeader( $propertyIdString ) {
		$propertyId = new PropertyId( $propertyIdString );
		$header = $this->createFormattedDataValue( $this->formatEntityId( $propertyId ) );
		$header->addClasses( [ 'wbmi-statements-header' ] );
		return $header;
	}

	/**
	 * @param string $formattedValue
	 * @return Tag
	 */
	private function createFormattedDataValue( $formattedValue ) {
		$label = new Tag( 'h4' );
		$label->addClasses( [ 'wbmi-entity-label' ] );
		$label->appendContent( $formattedValue );

		$tag = new Tag( 'div' );
		$tag->addClasses( [ 'wbmi-entity-title' ] );
		$tag->appendContent( $label );
		return $tag;
	}

	private function createStatementDiv( Statement $statement ) {
		$div = new Tag( 'div' );
		$div->appendContent( $this->innerStatementDiv( $statement ) );
		$div->addClasses( [ 'wbmi-item', 'wbmi-item-read' ] );
		return $div;
	}

	private function innerStatementDiv( Statement $statement ) {
		$mainSnak = $statement->getMainSnak();

		$statementDiv = new Tag( 'div' );
		$statementDiv->addClasses( [ 'wbmi-item-container' ] );

		$guid = $statement->getGuid();
		if ( $guid !== null ) {
			$statementDiv->setAttributes( [ 'data-guid' => $guid ] );
		}

		$mainSnakDiv = new Tag( 'div' );
		$mainSnakDiv->appendContent(
			$this->createFormattedDataValue( $this->formatSnak( $mainSnak ) )
		);

		$statementDiv->appendContent( $mainSnakDiv );
		$qualifiers = $statement->getQualifiers();
		if ( count( $qualifiers ) > 0 ) {
			$statementDiv->appendContent( $this->createQualifiersDiv( $qualifiers ) );
		}
		return $statementDiv;
	}

	private function createQualifiersDiv( SnakList $snakList ) {
		$container = new Tag( 'div' );
		$container->addClasses( [ 'wbmi-item-content' ] );

		$propertyOrder = $this->propertyOrderProvider->getPropertyOrder();
		if ( $propertyOrder === null ) {
			$snakList->orderByProperty();
		} else {
			$propertyIds = array_flip( $propertyOrder );
			ksort( $propertyIds );
			$snakList->orderByProperty(
				array_values( $propertyIds )
			);
		}

		$qualifierDivs = [];

		/** @var Snak $snak */
		foreach ( $snakList as $snak ) {
			$formattedProperty = '';
			if ( $snak instanceof SnakObject ) {
				$formattedProperty = $this->formatEntityId( $snak->getPropertyId(), SnakFormatter::FORMAT_HTML );
			}

			$formattedValue = $this->formatSnak( $snak, SnakFormatter::FORMAT_HTML );

			$separator = Html::element( 'span', [], $this->textProvider->get( 'colon-separator' ) );

			$qualifierValueDiv = new Tag( 'div' );
			$qualifierValueDiv->addClasses( [ 'wbmi-qualifier-value' ] );
			$qualifierValueDiv->appendContent(
				new HtmlSnippet( $formattedProperty ),
				// if we have both a property & a value, add a separator
				$formattedProperty && $formattedValue ? new HtmlSnippet( $separator ) : '',
				new HtmlSnippet( $formattedValue )
			);

			$qualifierDiv = new Tag( 'div' );
			$qualifierDiv->addClasses( [ 'wbmi-qualifier' ] );
			$qualifierDiv->appendContent( $qualifierValueDiv );

			$qualifierDivs[] = $qualifierDiv;
		}

		$innerDiv = new Tag( 'div' );
		$innerDiv->addClasses( [ 'wbmi-item-content-group' ] );
		$innerDiv->appendContent( ...$qualifierDivs );
		$container->appendContent(
			$innerDiv
		);
		return $container;
	}

	/**
	 * @param Snak $snak
	 * @param string $format
	 * @return string
	 */
	private function formatSnak( Snak $snak, $format = SnakFormatter::FORMAT_PLAIN ) {
		$formatter = $this->snakFormatterFactory->getSnakFormatter(
			$format,
			new FormatterOptions( [ ValueFormatter::OPT_LANG => $this->languageCode ] )
		);

		$formatted = $formatter->formatSnak( $snak );

		// if there are any links inside the formatted content, make them open in a new window
		return preg_replace( '/<a/', '<a target="_blank"', $formatted );
	}

	/**
	 * @param DataValue $value
	 * @param string $format
	 * @return string
	 */
	private function formatValue( DataValue $value, $format = SnakFormatter::FORMAT_PLAIN ) {
		$formatter = $this->valueFormatterFactory->getValueFormatter(
			$format,
			new FormatterOptions( [ ValueFormatter::OPT_LANG => $this->languageCode ] )
		);

		$formatted = $formatter->formatValue( $value );

		// if there are any links inside the formatted content, make them open in a new window
		return preg_replace( '/<a/', '<a target="_blank"', $formatted );
	}

	/**
	 * @param EntityId $entityId
	 * @param string $format
	 * @return string
	 */
	private function formatEntityId( EntityId $entityId, $format = SnakFormatter::FORMAT_PLAIN ) {
		return $this->formatValue( new EntityIdValue( $entityId ), $format );
	}

	/**
	 * Gather statements into an array with property ids (ordered by $this->propertyOrderProvider)
	 * as keys, and arrays of statements pertaining to those property ids (ordered by rank) as
	 * values
	 *
	 * @param StatementList $statementList
	 * @return array[]
	 */
	private function statementsByPropertyId( StatementList $statementList ) {

		$statementsByProperty = $this->getOrderedStatementsByProperty( $statementList );

		$propertyOrder = $this->propertyOrderProvider->getPropertyOrder();

		if ( !$propertyOrder ) {
			return $statementsByProperty;
		}

		$ordered = [];
		$unordered = [];

		foreach ( $statementsByProperty as $propertyId => $statements ) {
			if ( isset( $propertyOrder[$propertyId] ) ) {
				$ordered[$propertyOrder[$propertyId]] = $statements;
			} else {
				$unordered[] = $statements;
			}
		}

		ksort( $ordered );
		$orderedButNotIndexed = array_merge( $ordered, $unordered );
		$orderedAndIndexed = [];
		foreach ( $orderedButNotIndexed  as $statementArray ) {
			$orderedAndIndexed[$statementArray[0]->getPropertyId()->getSerialization()] =
				$statementArray;
		}
		return $orderedAndIndexed;
	}

	/**
	 * Returns array with property ids as keys and arrays of statements as elements. The arrays
	 * of statements are ordered by rank.
	 *
	 * @param StatementList $statementList
	 * @return array[]
	 */
	private function getOrderedStatementsByProperty( StatementList $statementList ) {
		$statementsByPropertyAndRank = [];
		foreach ( $statementList as $statement ) {
			$propertyId = $statement->getPropertyId()->getSerialization();
			if ( !isset( $statementsByPropertyAndRank[$propertyId] ) ) {
				$statementsByPropertyAndRank[$propertyId] = [
					Statement::RANK_PREFERRED => [],
					Statement::RANK_NORMAL => [],
					Statement::RANK_DEPRECATED => [],
				];
			}
			$rank = $statement->getRank();
			$statementsByPropertyAndRank[$propertyId][$rank][] = $statement;
		}

		$statementsByProperty = [];
		foreach ( $statementsByPropertyAndRank as $propertyId => $array ) {
			$statementsByProperty[$propertyId] = array_merge(
				$array[Statement::RANK_PREFERRED],
				$array[Statement::RANK_NORMAL],
				$array[Statement::RANK_DEPRECATED]
			);
		}

		$statementsByProperty = $this->addDefaultStatements( $statementsByProperty );

		return $statementsByProperty;
	}

	private function addDefaultStatements( $statementsByProperty ) {
		foreach ( $this->defaultPropertyIds as $propertyId ) {
			if ( !isset( $statementsByProperty[ $propertyId->getSerialization() ] ) ) {
				$statementsByProperty[ $propertyId->getSerialization() ] =
					[
						new Statement(
							new PropertyNoValueSnak( $propertyId )
						)
					];
			}
		}
		return $statementsByProperty;
	}

}
