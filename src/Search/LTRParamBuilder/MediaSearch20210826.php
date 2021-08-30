<?php

namespace Wikibase\MediaInfo\Search\LTRParamBuilder;

use Elastica\Query\AbstractQuery;

class MediaSearch20210826 implements MediaSearchLTRParamBuilder {
	public const DIGITAL_REPRESENTATION_OF = 'P6243';
	public const DEPICTS = 'P180';
	private $querySearchTerms = [];

	public function getModelParams( AbstractQuery $query, string $langCode ): array {
		$params = [
			'language' => $langCode,
			'text_search_term' => [],
		];
		for ( $i = 1; $i <= 50; $i++ ) {
			$params['DigRepOf_' . $i] = self::DIGITAL_REPRESENTATION_OF . '=NO_ENTITY';
			$params['Depicts_' . $i] = self::DEPICTS . '=NO_ENTITY';
		}

		$this->setQuerySearchTerms( $query->toArray() );
		$this->querySearchTerms = array_unique( $this->querySearchTerms );
		$countDepicts = $countDigRepOf = 1;
		foreach ( $this->querySearchTerms as $value ) {
			if ( preg_match( '/^P[1-9][0-9]*=Q[1-9][0-9]*$/', $value ) ) {
				if ( strpos( $value, self::DEPICTS . '=' ) === 0 && $countDepicts <= 50 ) {
					$params['Depicts_' . $countDepicts] = $value;
					$countDepicts++;
				} elseif (
					strpos( $value, self::DIGITAL_REPRESENTATION_OF . '=' ) === 0 &&
					$countDigRepOf <= 50
				) {
					$params['DigRepOf_' . $countDigRepOf] = $value;
					$countDigRepOf++;
				}
			} elseif ( !in_array( $value,  $params['text_search_term'] ) ) {
				$params['text_search_term'][] = $value;
			}
		}
		$params['text_search_term'] = implode( ' ', $params['text_search_term'] );
		return $params;
	}

	private function setQuerySearchTerms( array $array ) {
		foreach ( $array as $key => $value ) {
			if ( is_array( $value ) ) {
				$this->setQuerySearchTerms( $value );
			} elseif ( $key === 'query' ) {
				$this->querySearchTerms[] = $value;
			}
		}
	}
}
