<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use DataValues\DataValue;
use DataValues\StringValue;
use MediaWikiTestCaseTrait;
use ValueFormatters\FormatterOptions;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\NumericPropertyId;
use Wikibase\DataModel\Serializers\SerializerFactory;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Snak\PropertySomeValueSnak;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\DataModel\Snak\Snak;
use Wikibase\DataModel\Snak\SnakList;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\Lib\Formatters\DispatchingValueFormatter;
use Wikibase\Lib\Formatters\OutputFormatSnakFormatterFactory;
use Wikibase\Lib\Formatters\OutputFormatValueFormatterFactory;
use Wikibase\Lib\Formatters\SnakFormatter;
use Wikibase\Lib\LanguageWithConversion;
use Wikibase\Lib\Store\PropertyOrderProvider;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\View\MediaInfoEntityStatementsView;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\View\LocalizedTextProvider;

/**
 * @covers \Wikibase\MediaInfo\View\MediaInfoEntityStatementsView
 *
 * @group WikibaseMediaInfo
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityStatementsViewTest extends \PHPUnit\Framework\TestCase {
	use MediaWikiTestCaseTrait;

	/**
	 * @var LocalizedTextProvider
	 */
	private $textProvider;
	/**
	 * @var OutputFormatSnakFormatterFactory
	 */
	private $snakFormatterFactory;
	/**
	 * @var OutputFormatValueFormatterFactory
	 */
	private $valueFormatterFactory;
	/**
	 * @var SerializerFactory
	 */
	private $serializerFactory;

	private function createDependencies( array $langCodes = [ 'en' ] ) {
		$languages = [];
		foreach ( $langCodes as $langCode ) {
			$languages[] = LanguageWithConversion::factory( $langCode );
		}
		$this->textProvider = new MediaWikiLocalizedTextProvider( $languages[0]->getLanguage() );

		$this->serializerFactory = WikibaseRepo::getCompactBaseDataModelSerializerFactory();

		$snakFormatter = $this->createMock( SnakFormatter::class );
		$snakFormatter->method( 'formatSnak' )
			->will(
				$this->returnCallback( function ( Snak $snak ) {
					if ( $snak instanceof PropertyNoValueSnak ) {
						return $this->textProvider->get(
							'wikibasemediainfo-filepage-statement-no-value'
						);
					} elseif ( $snak instanceof PropertySomeValueSnak ) {
						return $this->textProvider->get(
							'wikibasemediainfo-filepage-statement-some-value'
						);
					} elseif ( $snak instanceof PropertyValueSnak ) {
						$value = $snak->getDataValue();
						if ( !( $value instanceof EntityIdValue ) ) {
							return $value->getValue();
						}
						$map = [
							'Q333' => 'ITEM Q333 LABEL',
							'Q999' => 'ITEM Q999 LABEL',
							'Q3333' => 'ITEM Q3333 LABEL',
						];
						if ( isset( $map[$value->getEntityId()->getSerialization()] ) ) {
							return $map[$value->getEntityId()->getSerialization()];
						}
					}
					return '';
				} )
			);
		$this->snakFormatterFactory = $this->createMock( OutputFormatSnakFormatterFactory::class );
		$this->snakFormatterFactory->method( 'getSnakFormatter' )->willReturn( $snakFormatter );

		$valueFormatter = $this->createMock( DispatchingValueFormatter::class );
		$valueFormatter->method( 'formatValue' )
			->will(
				$this->returnCallback( static function ( DataValue $value ) {
					$map = [
						'P333' => 'PROPERTY P333 LABEL',
						'P444' => 'PROPERTY P444 LABEL',
						'P555' => 'PROPERTY P555 LABEL',
						'P666' => 'PROPERTY P666 LABEL',
						'P777' => 'PROPERTY P777 LABEL',
						'P888' => 'PROPERTY P888 LABEL',
						'P999' => 'PROPERTY P999 LABEL',
					];
					if (
						$value instanceof EntityIdValue &&
						isset( $map[$value->getEntityId()->getSerialization()] )
					) {
						return $map[$value->getEntityId()->getSerialization()];
					}
					return '';
				} )
			);
		$this->valueFormatterFactory = $this->createMock( OutputFormatValueFormatterFactory::class );
		$this->valueFormatterFactory->method( 'getValueFormatter' )->willReturn( $valueFormatter );
	}

	/**
	 * @dataProvider provideStatementList
	 * @param StatementList $statementList
	 */
	public function testGetHtml( StatementList $statementList ) {
		$this->createDependencies();

		$orderProvider = $this->createMock( PropertyOrderProvider::class );
		$orderProvider->method( 'getPropertyOrder' )
			->willReturn( [
				'P888' => 1,
				'P999' => 2,
				'P777' => 3,
				'P555' => 4,
				'P666' => 5,
				'P444' => 6,
				'P333' => 7
			] );

		$sut = new MediaInfoEntityStatementsView(
			$orderProvider,
			$this->textProvider,
			[ new NumericPropertyId( 'P1' ) ],
			$this->snakFormatterFactory,
			$this->valueFormatterFactory,
			$this->serializerFactory,
			'en',
			[ 'depicts' => 'P1' ]
		);
		$html = $sut->getHtml(
			new MediaInfo( null, null, null, $statementList )
		);

		$sortedStatementList = $this->sortStatementList( $statementList, $orderProvider );

		$this->assertMatchesRegularExpression( $this->getPropertyIdRegex( $sortedStatementList ), $html );
		$this->assertMatchesRegularExpression(
			$this->getMainSnakValueRegex(
				$sortedStatementList
			),
			$html
		);
		$this->assertMatchesRegularExpression(
			$this->getQualifiersRegex(
				$sortedStatementList
			),
			$html
		);
	}

	/**
	 * @param StatementList $sortedStatementList
	 * @return string
	 */
	private function getPropertyIdRegex( StatementList $sortedStatementList ) {
		$propertyIds = [];
		foreach ( $sortedStatementList as $statement ) {
			$propertyIds[] = $statement->getPropertyId();
		}
		return '/' . implode( '.+', array_unique( $propertyIds ) ) . '/';
	}

	/**
	 * @param StatementList $sortedStatementList
	 * @return string
	 */
	private function getMainSnakValueRegex(
		StatementList $sortedStatementList
	) {
		$values = [];
		foreach ( $sortedStatementList as $statement ) {
			$mainSnak = $statement->getMainSnak();
			$values[] = $this->getSnakValueRegexPart( $mainSnak );
		}
		return '/' . implode( '.+', array_unique( $values ) ) . '/';
	}

	/**
	 * @param StatementList $sortedStatementList
	 * @return string
	 */
	private function getQualifiersRegex(
		StatementList $sortedStatementList
	) {
		$snakFormatter = $this->snakFormatterFactory->getSnakFormatter(
			null,
			new FormatterOptions()
		);
		$valueFormatter = $this->valueFormatterFactory->getValueFormatter(
			null,
			new FormatterOptions()
		);
		$labels = [];
		foreach ( $sortedStatementList as $statement ) {
			$propertyIds = [];
			$qualifiers = $statement->getQualifiers();
			/** @var Snak $snak */
			foreach ( $qualifiers as $snak ) {
				if ( !( in_array( $snak->getPropertyId(), $propertyIds ) ) ) {
					$labels[] = $valueFormatter->formatValue(
						new EntityIdValue( $snak->getPropertyId() )
					);
					$propertyIds[] = $snak->getPropertyId();
				}
				$labels[] = $snakFormatter->formatSnak( $snak );
			}
		}
		return '/' . implode( '.+', $labels ) . '/';
	}

	private function getSnakValueRegexPart(
		Snak $snak
	) {
		$snakFormatter = $this->snakFormatterFactory->getSnakFormatter(
			null,
			new FormatterOptions()
		);
		return $snakFormatter->formatSnak( $snak );
	}

	/**
	 * Orders the statements by property order and rank, and their qualifiers by property order
	 *
	 * @param StatementList $statementList
	 * @param PropertyOrderProvider $propertyOrderProvider
	 * @return StatementList
	 */
	private function sortStatementList(
		StatementList $statementList,
		PropertyOrderProvider $propertyOrderProvider
	) {
		$propertyOrder = $propertyOrderProvider->getPropertyOrder();

		$statementsByPropertyAndRank = [];
		/** @var Statement $statement */
		foreach ( $statementList as $statement ) {
			$propertyId = $statement->getPropertyId()->getSerialization();
			if ( !isset( $statementsByPropertyAndRank[$propertyId] ) ) {
				$statementsByPropertyAndRank[$propertyId] = [
					Statement::RANK_PREFERRED => [],
					Statement::RANK_NORMAL => [],
					Statement::RANK_DEPRECATED => [],
				];
			}
			$statementsByPropertyAndRank[$propertyId][$statement->getRank()][] = $statement;
		}

		$ordered = $unordered = [];
		foreach ( $statementsByPropertyAndRank as $propertyId => $statementsByRank ) {
			if ( isset( $propertyOrder[$propertyId] ) ) {
				$ordered[$propertyOrder[$propertyId]] = array_merge(
					$statementsByRank[Statement::RANK_PREFERRED],
					$statementsByRank[Statement::RANK_NORMAL],
					$statementsByRank[Statement::RANK_DEPRECATED]
				);
			} else {
				$unordered[] = array_merge(
					$statementsByRank[Statement::RANK_PREFERRED],
					$statementsByRank[Statement::RANK_NORMAL],
					$statementsByRank[Statement::RANK_DEPRECATED]
				);
			}
		}
		ksort( $ordered );
		$sortedStatementArrays = array_merge( $ordered, $unordered );

		$statements = [];
		foreach ( $sortedStatementArrays as $statementArray ) {
			foreach ( $statementArray as $statement ) {
				$statements[] = $this->sortQualifiers( $statement, $propertyOrderProvider );
			}
		}
		return new StatementList( ...$statements );
	}

	private function sortQualifiers(
		Statement $statement,
		PropertyOrderProvider $propertyOrderProvider
	) {
		$propertyOrder = $propertyOrderProvider->getPropertyOrder();

		$ordered = $unordered = [];
		/** @var Snak $snak */
		foreach ( $statement->getQualifiers() as $snak ) {
			$propertyId = $snak->getPropertyId()->getSerialization();
			if ( isset( $propertyOrder[$propertyId] ) ) {
				$ordered[$propertyOrder[$propertyId]] = $snak;
			} else {
				$unordered[] = $snak;
			}
		}
		ksort( $ordered );
		$qualifiers = new SnakList( array_merge( $ordered, $unordered ) );
		$statement->setQualifiers( $qualifiers );
		return $statement;
	}

	public function provideStatementList() {
		$property999NoValue = new PropertyNoValueSnak( new NumericPropertyId( 'P999' ) );
		$property999SomeValue = new PropertySomeValueSnak( new NumericPropertyId( 'P999' ) );
		$property999Value_1 = new PropertyValueSnak(
			new NumericPropertyId( 'P999' ),
			new StringValue( uniqid() )
		);
		$property999Value_2 = new PropertyValueSnak(
			new NumericPropertyId( 'P999' ),
			new StringValue( uniqid() )
		);
		$statement999Value_2 = new Statement( $property999Value_2 );
		$statement999Value_2->setRank( Statement::RANK_DEPRECATED );
		$property999Value_3 = new PropertyValueSnak(
			new NumericPropertyId( 'P999' ),
			new StringValue( uniqid() )
		);
		$statement999Value_3 = new Statement( $property999Value_3 );
		$statement999Value_3->setRank( Statement::RANK_PREFERRED );
		$property888Value = new PropertyValueSnak(
			new NumericPropertyId( 'P888' ),
			new StringValue( uniqid() )
		);
		$property777Value = new PropertyValueSnak(
			new NumericPropertyId( 'P777' ),
			new EntityIdValue( new ItemId( 'Q999' ) )
		);

		$qualifier333Value_1 = new PropertyValueSnak(
			new NumericPropertyId( 'P333' ),
			new EntityIdValue( new ItemId( 'Q333' ) )
		);
		$qualifier333Value_2 = new PropertyValueSnak(
			new NumericPropertyId( 'P333' ),
			new EntityIdValue( new ItemId( 'Q3333' ) )
		);
		$qualifier444 = new PropertyNoValueSnak(
			new NumericPropertyId( 'P444' )
		);
		$qualifier555 = new PropertySomeValueSnak(
			new NumericPropertyId( 'P555' )
		);
		$qualifier666 = new PropertyValueSnak(
			new NumericPropertyId( 'P666' ),
			new StringValue( uniqid() )
		);
		$qualifiers = new SnakList( [
			$qualifier333Value_1,
			$qualifier444,
			$qualifier555,
			$qualifier666,
			$qualifier333Value_2,
		] );

		$statement999Value_2->setQualifiers( $qualifiers );
		$statement999Value_3->setQualifiers( $qualifiers );

		return [
			'empty' => [
				'statementList' => new StatementList()
			],
			'single statement, no qualifiers' => [
				'statementList' => new StatementList(
					new Statement( $property999NoValue )
				)
			],
			'statements, with qualifiers' => [
				'statementList' => new StatementList(
					new Statement( $property999SomeValue ),
					new Statement( $property999NoValue ),
					new Statement( $property999Value_1 ),
					$statement999Value_2,
					$statement999Value_3,
					new Statement( $property888Value ),
					new Statement( $property777Value )
				)
			],
		];
	}

}
