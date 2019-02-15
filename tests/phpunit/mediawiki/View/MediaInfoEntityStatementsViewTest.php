<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use DataValues\StringValue;
use ValueFormatters\FormatterOptions;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\SerializerFactory;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Snak\PropertySomeValueSnak;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\DataModel\Snak\Snak;
use Wikibase\DataModel\Snak\SnakList;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\LanguageWithConversion;
use Wikibase\Lib\Formatters\DispatchingValueFormatter;
use Wikibase\Lib\OutputFormatSnakFormatterFactory;
use Wikibase\Lib\OutputFormatValueFormatterFactory;
use Wikibase\Lib\SnakFormatter;
use Wikibase\Lib\Store\EntityTitleLookup;
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

	/**
	 * @var LocalizedTextProvider
	 */
	private $textProvider;
	/**
	 * @var EntityTitleLookup
	 */
	private $entityTitleLookup;
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
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$languages = [];
		foreach ( $langCodes as $langCode ) {
			$languages[] = LanguageWithConversion::factory( $langCode );
		}
		$this->textProvider = new MediaWikiLocalizedTextProvider( $languages[0]->getLanguage() );
		$this->entityTitleLookup = $wbRepo->getEntityTitleLookup();
		$this->serializerFactory = $wbRepo->getCompactBaseDataModelSerializerFactory();

		$snakFormatter = $this->getMockBuilder( SnakFormatter::class )
			->disableOriginalConstructor()
			->getMock();
		$snakFormatter->method( 'formatSnak' )
			->will(
				$this->returnCallback( function( Snak $snak ) {
					if ( $snak instanceof PropertyNoValueSnak ) {
						return $this->textProvider->get(
							'wikibase-snakview-snaktypeselector-novalue'
						);
					} elseif ( $snak instanceof PropertySomeValueSnak ) {
						return $this->textProvider->get(
							'wikibase-snakview-variations-somevalue-label'
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
		$this->snakFormatterFactory = $this->getMockBuilder(
				OutputFormatSnakFormatterFactory::class
			)
			->disableOriginalConstructor()
			->getMock();
		$this->snakFormatterFactory->method( 'getSnakFormatter' )->willReturn( $snakFormatter );

		$valueFormatter = $this->getMockBuilder( DispatchingValueFormatter::class )
			->disableOriginalConstructor()
			->getMock();
		$valueFormatter->method( 'formatValue' )
			->will(
				$this->returnCallback( function( EntityIdValue $value ) {
					$map = [
						'P333' => 'PROPERTY P333 LABEL',
						'P444' => 'PROPERTY P444 LABEL',
						'P555' => 'PROPERTY P555 LABEL',
						'P666' => 'PROPERTY P666 LABEL',
						'P777' => 'PROPERTY P777 LABEL',
						'P888' => 'PROPERTY P888 LABEL',
						'P999' => 'PROPERTY P999 LABEL',
					];
					if ( isset( $map[$value->getEntityId()->getSerialization()] ) ) {
						return $map[$value->getEntityId()->getSerialization()];
					}
					return null;
				} )
			);
		$this->valueFormatterFactory = $this->getMockBuilder(
			OutputFormatValueFormatterFactory::class
		)
			->disableOriginalConstructor()
			->getMock();
		$this->valueFormatterFactory->method( 'getValueFormatter' )->willReturn( $valueFormatter );
	}

	/**
	 * @dataProvider provideStatementList
	 * @param StatementList $statementList
	 */
	public function testGetHtml( StatementList $statementList ) {
		$this->createDependencies();

		$orderProvider = $this->getMockBuilder( PropertyOrderProvider::class )
			->disableOriginalConstructor()
			->getMock();
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
			$this->entityTitleLookup,
			[ new PropertyId( 'P1' ) ],
			$this->snakFormatterFactory,
			$this->valueFormatterFactory,
			$this->serializerFactory,
			'en',
			true
		);
		$html = $sut->getHtml(
			new MediaInfo( null, null, null, $statementList )
		);

		$sortedStatementList = $this->sortStatementList( $statementList, $orderProvider );

		$this->assertRegExp( $this->getPropertyIdRegex( $sortedStatementList ), $html );
		$this->assertRegExp(
			$this->getMainSnakValueRegex(
				$sortedStatementList
			),
			$html
		);
		$this->assertRegExp(
			$this->getQualifiersRegex(
				$sortedStatementList
			),
			$html
		);
	}

	/**
	 * @dataProvider provideStatementList
	 * @param StatementList $statementList
	 */
	public function testGetHtml_noQualifiers( StatementList $statementList ) {
		$this->createDependencies();

		$orderProvider = $this->getMockBuilder( PropertyOrderProvider::class )
			->disableOriginalConstructor()
			->getMock();
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
			$this->entityTitleLookup,
			[ new PropertyId( 'P1' ) ],
			$this->snakFormatterFactory,
			$this->valueFormatterFactory,
			$this->serializerFactory,
			'en',
			false
		);
		$html = $sut->getHtml(
			new MediaInfo( null, null, null, $statementList )
		);

		$sortedStatementList = $this->sortStatementList( $statementList, $orderProvider );

		$this->assertRegExp( $this->getPropertyIdRegex( $sortedStatementList ), $html );
		$this->assertRegExp(
			$this->getMainSnakValueRegex(
				$sortedStatementList
			),
			$html
		);
		$qualifiersRegex = $this->getQualifiersRegex( $sortedStatementList );
		if ( $qualifiersRegex != '//' ) {
			$this->assertNotRegExp(
				$this->getQualifiersRegex(
					$sortedStatementList
				),
				$html
			);
		}
	}

	/**
	 * @param StatementList $sortedStatementList The SORTED statement list
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
	 * @param StatementList $sortedStatementList The SORTED statement list
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
	 * @param StatementList $sortedStatementList The SORTED statement list
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
		return new StatementList( $statements );
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

		$property999NoValue = new PropertyNoValueSnak( new PropertyId( 'P999' ) );
		$property999SomeValue = new PropertySomeValueSnak( new PropertyId( 'P999' ) );
		$property999Value_1 = new PropertyValueSnak(
			new PropertyId( 'P999' ),
			new StringValue( uniqid() )
		);
		$property999Value_2 = new PropertyValueSnak(
			new PropertyId( 'P999' ),
			new StringValue( uniqid() )
		);
		$statement999Value_2 = new Statement( $property999Value_2 );
		$statement999Value_2->setRank( Statement::RANK_DEPRECATED );
		$property999Value_3 = new PropertyValueSnak(
			new PropertyId( 'P999' ),
			new StringValue( uniqid() )
		);
		$statement999Value_3 = new Statement( $property999Value_3 );
		$statement999Value_3->setRank( Statement::RANK_PREFERRED );
		$property888Value = new PropertyValueSnak(
			new PropertyId( 'P888' ),
			new StringValue( uniqid() )
		);
		$property777Value = new PropertyValueSnak(
			new PropertyId( 'P777' ),
			new EntityIdValue( new ItemId( 'Q999' ) )
		);

		$qualifier333Value_1 = new PropertyValueSnak(
			new PropertyId( 'P333' ),
			new EntityIdValue( new ItemId( 'Q333' ) )
		);
		$qualifier333Value_2 = new PropertyValueSnak(
			new PropertyId( 'P333' ),
			new EntityIdValue( new ItemId( 'Q3333' ) )
		);
		$qualifier444 = new PropertyNoValueSnak(
			new PropertyId( 'P444' )
		);
		$qualifier555 = new PropertySomeValueSnak(
			new PropertyId( 'P555' )
		);
		$qualifier666 = new PropertyValueSnak(
			new PropertyId( 'P666' ),
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
				'statementList' => new StatementList( [
					new Statement( $property999NoValue )
				] )
			],
			'statements, with qualifiers' => [
				'statementList' => new StatementList( [
					new Statement( $property999SomeValue ),
					new Statement( $property999NoValue ),
					new Statement( $property999Value_1 ),
					$statement999Value_2,
					$statement999Value_3,
					new Statement( $property888Value ),
					new Statement( $property777Value ),
				] )
			],
		];
	}

}
