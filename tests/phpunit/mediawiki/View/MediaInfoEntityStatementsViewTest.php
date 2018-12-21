<?php

namespace Wikibase\MediaInfo\Tests\MediaWiki\View;

use DataValues\StringValue;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\ItemId;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\DataModel\Snak\PropertyNoValueSnak;
use Wikibase\DataModel\Snak\PropertySomeValueSnak;
use Wikibase\DataModel\Snak\PropertyValueSnak;
use Wikibase\DataModel\Snak\Snak;
use Wikibase\DataModel\Snak\SnakList;
use Wikibase\DataModel\Statement\Statement;
use Wikibase\DataModel\Statement\StatementList;
use Wikibase\DataModel\Term\Term;
use Wikibase\DataModel\Term\TermFallback;
use Wikibase\LanguageFallbackChain;
use Wikibase\LanguageWithConversion;
use Wikibase\Lib\LanguageFallbackIndicator;
use Wikibase\Lib\Store\EntityTitleLookup;
use Wikibase\Lib\Store\PropertyOrderProvider;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\MediaInfo\View\MediaInfoEntityStatementsView;
use Wikibase\Repo\MediaWikiLanguageDirectionalityLookup;
use Wikibase\Repo\MediaWikiLocalizedTextProvider;
use Wikibase\Repo\WikibaseRepo;
use Wikibase\View\LanguageDirectionalityLookup;
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
	 * @var LanguageDirectionalityLookup
	 */
	private $langDirLookup;
	/**
	 * @var LocalizedTextProvider
	 */
	private $textProvider;
	/**
	 * @var LanguageFallbackChain
	 */
	private $fallbackChain;
	/**
	 * @var EntityTitleLookup
	 */
	private $entityTitleLookup;
	/**
	 * @var LanguageFallbackIndicator
	 */
	private $languageFallbackIndicator;

	private function createDependencies( array $langCodes = [ 'en' ] ) {
		$wbRepo = WikibaseRepo::getDefaultInstance();
		$languages = [];
		foreach ( $langCodes as $langCode ) {
			$languages[] = LanguageWithConversion::factory( $langCode );
		}
		$this->langDirLookup = new MediaWikiLanguageDirectionalityLookup();
		$this->fallbackChain = new LanguageFallbackChain( $languages );
		$this->textProvider = new MediaWikiLocalizedTextProvider( $languages[0]->getLanguage() );
		$this->entityTitleLookup = $wbRepo->getEntityTitleLookup();
		$this->languageFallbackIndicator =
			new LanguageFallbackIndicator( $wbRepo->getLanguageNameLookup() );
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

		$labelLookup = $this->getMockBuilder( LabelDescriptionLookup::class )
			->disableOriginalConstructor()
			->getMock();
		$labelLookup->method( 'getLabel' )
			->will(
				$this->returnCallback( function( EntityId $entityId ) {
					$map = [
						'Q333' => new Term( 'qqq', 'ITEM Q333 LABEL' ),
						'P444' => new Term( 'qqq', 'PROPERTY P444 LABEL' ),
						'P555' => new Term( 'qqq', 'PROPERTY P555 LABEL' ),
						'P666' => new TermFallback( 'qqq', 'PROPERTY P666 LABEL', 'en', 'fr' ),
					];
					if ( isset( $map[$entityId->getSerialization()] ) ) {
						return $map[$entityId->getSerialization()];
					}
					return null;
				} )
			);

		$sut = new MediaInfoEntityStatementsView(
			$orderProvider,
			$this->langDirLookup,
			$this->textProvider,
			$this->fallbackChain,
			$labelLookup,
			$this->entityTitleLookup,
			$this->languageFallbackIndicator
		);
		$html = $sut->getHtml(
			new MediaInfo( null, null, null, $statementList )
		);

		$sortedStatementList = $this->sortStatementList( $statementList, $orderProvider );

		$this->assertRegExp( $this->getPropertyIdRegex( $sortedStatementList ), $html );
		$this->assertRegExp(
			$this->getMainSnakValueRegex(
				$sortedStatementList,
				$labelLookup
			),
			$html
		);
		$this->assertRegExp(
			$this->getQualifiersRegex(
				$sortedStatementList,
				$labelLookup
			),
			$html
		);
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
		StatementList $sortedStatementList,
		LabelDescriptionLookup $labelLookup
	) {
		$values = [];
		foreach ( $sortedStatementList as $statement ) {
			$mainSnak = $statement->getMainSnak();
			$values[] = $this->getSnakValueRegexPart( $mainSnak, $labelLookup );
		}
		return '/' . implode( '.+', array_unique( $values ) ) . '/';
	}

	private function getQualifiersRegex(
		StatementList $sortedStatementList,
		LabelDescriptionLookup $labelLookup
	) {
		$labels = [];
		foreach ( $sortedStatementList as $statement ) {
			$qualifiers = $statement->getQualifiers();
			/** @var Snak $snak */
			foreach ( $qualifiers as $snak ) {
				$propertyIdLabel = $labelLookup->getLabel( $snak->getPropertyId() );
				if ( is_null( $propertyIdLabel ) ) {
					$labels[] = $snak->getPropertyId()->getSerialization();
				} else {
					$labels[] = $propertyIdLabel->getText();
				}
				if ( $snak instanceof PropertyNoValueSnak ) {
					$labels[] = $this->textProvider->get(
						'wikibasemediainfo-filepage-statement-no-value'
					);
				} elseif ( $snak instanceof PropertySomeValueSnak ) {
					$labels[] = $this->textProvider->get(
						'wikibasemediainfo-filepage-statement-some-value'
					);
				} elseif ( $snak instanceof PropertyValueSnak ) {
					$value = $snak->getDataValue();
					if ( $value instanceof EntityIdValue ) {
						$label = $labelLookup->getLabel( $value->getEntityId() );
						if ( is_null( $label ) ) {
							$labels[] = $value->getEntityId()->getSerialization();
						} else {
							$labels[] = $label->getText();
						}
					} else {
						$labels[] = $value->getValue();
					}
				}
			}
		}
		return '/' . implode( '.+', $labels ) . '/';
	}

	private function getSnakValueRegexPart(
		Snak $snak,
		LabelDescriptionLookup $labelDescriptionLookup
	) {
		$regexPart = '';
		if ( $snak instanceof PropertyValueSnak ) {
			$value = $snak->getDataValue()->getValue();
			if ( $value instanceof EntityIdValue ) {
				$label = $labelDescriptionLookup->getLabel( $value->getEntityId() );
				if ( !is_null( $label ) ) {
					$regexPart = $label;
				} else {
					$regexPart = $value->getEntityId()->getSerialization();
				}
			} else {
				$regexPart = $value;
			}
		} elseif ( $snak instanceof PropertySomeValueSnak ) {
			$regexPart =
				$this->textProvider->get( 'wikibasemediainfo-filepage-statement-some-value' );
		} elseif ( $snak instanceof PropertyNoValueSnak ) {
			$regexPart =
				$this->textProvider->get( 'wikibasemediainfo-filepage-statement-no-value' );
		}
		return $regexPart;
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
