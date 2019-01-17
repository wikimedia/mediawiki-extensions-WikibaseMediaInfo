<?php

namespace Wikibase\MediaInfo\View;

use Html;
use OOUI\HtmlSnippet;
use OOUI\Layout;
use OOUI\PanelLayout;
use OOUI\Tag;
use OutputPage;
use Title;
use Wikibase\DataModel\Entity\EntityId;
use Wikibase\DataModel\Entity\EntityIdValue;
use Wikibase\DataModel\Entity\PropertyId;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookup;
use Wikibase\DataModel\Services\Lookup\LabelDescriptionLookupException;
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
use Wikibase\Lib\LanguageFallbackIndicator;
use Wikibase\Lib\Store\EntityTitleLookup;
use Wikibase\Lib\Store\PropertyOrderProvider;
use Wikibase\MediaInfo\DataModel\MediaInfo;
use Wikibase\View\LanguageDirectionalityLookup;
use Wikibase\View\LocalizedTextProvider;

/**
 * Generates HTML to display the statements of a MediaInfo entity
 *
 * @license GPL-2.0-or-later
 */
class MediaInfoEntityStatementsView {

	private $propertyOrderProvider;
	private $dirLookup;
	private $textProvider;
	private $fallbackChain;
	private $entityIdValueFormatter;

	/**
	 * MediaInfoEntityStatementsView constructor.
	 * @param PropertyOrderProvider $propertyOrderProvider
	 * @param LanguageDirectionalityLookup $languageDirectionalityLookup
	 * @param LocalizedTextProvider $textProvider
	 * @param LanguageFallbackChain $fallbackChain
	 * @param LabelDescriptionLookup $labelDescriptionLookup
	 * @param EntityTitleLookup $entityTitleLookup
	 * @param LanguageFallbackIndicator $languageFallbackIndicator
	 */
	public function __construct(
		PropertyOrderProvider $propertyOrderProvider,
		LanguageDirectionalityLookup $languageDirectionalityLookup,
		LocalizedTextProvider $textProvider,
		LanguageFallbackChain $fallbackChain,
		LabelDescriptionLookup $labelDescriptionLookup,
		EntityTitleLookup $entityTitleLookup,
		LanguageFallbackIndicator $languageFallbackIndicator
	) {
		OutputPage::setupOOUI();

		$this->propertyOrderProvider = $propertyOrderProvider;
		$this->dirLookup = $languageDirectionalityLookup;
		$this->textProvider = $textProvider;
		$this->fallbackChain = $fallbackChain;
		$this->labelLookup = $labelDescriptionLookup;
		$this->entityTitleLookup = $entityTitleLookup;
		$this->languageFallbackIndicator = $languageFallbackIndicator;
	}

	/**
	 * @param MediaInfo $entity
	 * @return string
	 */
	public function getHtml( MediaInfo $entity ) {

		$statements = $this->statementsByPropertyId( $entity->getStatements() );

		/** @var PanelLayout[] $panels */
		$panels = [];
		foreach ( $statements as $propertyId => $statementArray ) {
			$panels[] = $this->getLayoutForProperty( $propertyId, $statementArray );
		}

		$html = '';
		foreach ( $panels as $panel ) {
			$html .= $panel->toString();
		}
		return $html;
	}

	private function getLayoutForProperty( $propertyId, array $statements ) {

		$subsections = [ $this->createPropertyHeader( $propertyId ) ];

		foreach ( $statements as $statement ) {
			$subsections[] = $this->createStatementLayout( $statement );
		}

		$panel = new PanelLayout( [
			'classes' => [ 'wbmi-entityview-statementsGroup' ],
			'scrollable' => false,
			'padded' => false,
			'expanded' => false,
			'framed' => true,
			'content' => $subsections
		] );
		return $panel;
	}

	private function createPropertyHeader( $propertyId ) {
		$propertyIdElement = new Tag( 'h4' );
		$propertyIdElement->appendContent(
			new HtmlSnippet(
				$this->getEntityHtmlPlusLink(
					new PropertyId( $propertyId )
				)
			)
		);
		return new Layout( [
			'classes' => [ 'wbmi-entityview-statementsGroup-header' ],
			'content' => [ $propertyIdElement ]
		] );
	}

	private function getEntityHtml( EntityId $entityId ) {
		$term = $this->lookupEntityLabel( $entityId );

		if ( $term === null ) {
			return $entityId->getSerialization();
		}

		$html = $term->getText();
		if ( $term instanceof TermFallback ) {
			$html .= $this->languageFallbackIndicator->getHtml( $term );
		}

		return $html;
	}

	private function getEntityHtmlPlusLink( EntityId $entityId ) {
		$linkClasses = [ 'wbmi-entity-link' ];
		$title = $this->entityTitleLookup->getTitleForId( $entityId );

		$html = $this->getEntityHtml( $entityId );

		if ( $title !== null && !$title->exists() ) {
				$linkClasses[] = 'new';
		}

		// Decorate the link with an icon for the relevant repository
		if ( !empty( $entityId->getRepositoryName() ) ) {
			$linkClasses[] = 'wbmi-entity-link-foreign-repo-' . $entityId->getRepositoryName();
		}

		$html .= Html::element(
			'a',
			$this->getAttributes( $title, $linkClasses ),
			$entityId->getLocalPart()
		);

		return $html;
	}

	private function getAttributes( Title $title, $classes = [] ) {
		$attributes = [
			'title' => $title->getPrefixedText(),
			'href' => $title->isLocal() ? $title->getLocalURL() : $title->getFullURL()
		];

		if ( $title->isLocal() && $title->isRedirect() ) {
			$classes[] = 'mw-redirect';
		}

		if ( !empty( $classes ) ) {
			$attributes['class'] = implode( ' ', $classes );
		}

		return $attributes;
	}

	private function lookupEntityLabel( EntityId $entityId ) {
		try {
			return $this->labelLookup->getLabel( $entityId );
		} catch ( LabelDescriptionLookupException $e ) {
			return null;
		}
	}

	private function createStatementLayout( Statement $statement ) {
		return new Layout( [
			'classes' => [ 'wbmi-entityview-statement' ],
			'content' => $this->createSnakLayout( $statement )
		] );
	}

	private function createSnakLayout( Statement $statement ) {
		$mainSnak = $statement->getMainSnak();
		$content = $this->getSnakValueHtml( $mainSnak, 'getEntityHtmlPlusLink' );
		$snakLayout = new Layout( [ 'content' => $content, 'classes' => 'mediainfo-snak' ] );
		$snakLayout->appendContent( $this->createQualifierLayouts( $statement->getQualifiers() ) );
		return $snakLayout;
	}

	private function createQualifierLayouts( SnakList $snakList ) {
		$qualifierHtmlByPropertyId = [];
		$propertyOrder = $this->propertyOrderProvider->getPropertyOrder();
		if ( is_null( $propertyOrder ) ) {
			$snakList->orderByProperty();
		} else {
			$propertyIds = array_flip( $propertyOrder );
			ksort( $propertyIds );
			$snakList->orderByProperty(
				array_values( $propertyIds )
			);
		}
		/** @var Snak $snak */
		foreach ( $snakList as $snak ) {
			$qualifierHtmlByPropertyId[$snak->getPropertyId()->getSerialization()][] =
				$this->getSnakValueHtml( $snak, 'getEntityHtml' );

		}
		$layouts = [];
		foreach ( $qualifierHtmlByPropertyId as $propertyIdString => $qualifierHtmlArray ) {
			$content = $this->getEntityHtml( new PropertyId( $propertyIdString ) );
			$content .= $this->textProvider->get( 'colon-separator' );
			$content .= implode( $this->textProvider->get( 'comma-separator' ), $qualifierHtmlArray );
			$layouts[] = new Layout( [
				'content' => new HtmlSnippet( $content ),
				'classes' => [ 'wbmi-entityview-statement-qualifier' ],
			] );
		}
		return $layouts;
	}

	private function getSnakValueHtml( Snak $snak, $entityIdValueRenderer ) {
		if ( $snak instanceof PropertyNoValueSnak ) {
			$content = Html::element(
				'em',
				[ 'class' => 'wbmi-statement-no-value' ],
				$this->textProvider->get( 'wikibasemediainfo-filepage-statement-no-value' )
			);
		} elseif ( $snak instanceof PropertySomeValueSnak ) {
			$content = Html::element(
				'em',
				[ 'class' => 'wbmi-statement-some-value' ],
				$this->textProvider->get( 'wikibasemediainfo-filepage-statement-some-value' )
			);
		} elseif ( $snak instanceof PropertyValueSnak ) {

			$value = $snak->getDataValue();
			if ( $value instanceof EntityIdValue ) {
				$content = new HtmlSnippet(
					call_user_func( [ $this, $entityIdValueRenderer ], $value->getEntityId() )
				);
			} else {
				$content = $value->getValue();
			}
		} else {
			// Error state; should not be reachable, but here just in case.
			$content = Html::element(
				'em',
				[ 'class' => 'wbmi-statement-error' ],
				$this->textProvider->get( 'wikibasemediainfo-filepage-statement-error' )
			);
		}
		return new HtmlSnippet( (string)$content );
	}

	/**
	 * Gather statements into an array with property ids (ordered by $this->propertyOrderProvider)
	 * as keys, and arrays of statements pertaining to those property ids (ordered by rank) as
	 * values
	 *
	 * @param StatementList[] $statementList
	 * @return array
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
	 * @return array
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
		return $statementsByProperty;
	}

}
