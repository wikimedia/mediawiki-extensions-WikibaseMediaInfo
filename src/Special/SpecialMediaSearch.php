<?php

namespace Wikibase\MediaInfo\Special;

use ApiBase;
use ApiMain;
use DerivativeContext;
use FauxRequest;
use OutputPage;
use RequestContext;
use SiteStats;
use TemplateParser;
use Title;
use UnlistedSpecialPage;
use Wikibase\MediaInfo\MustacheDomTemplateParser;
use Wikimedia\Assert\Assert;

/**
 * Special page specifically for searching multimedia pages.
 */
class SpecialMediaSearch extends UnlistedSpecialPage {

	/**
	 * @var ApiBase
	 */
	protected $api;

	/**
	 * @var TemplateParser
	 */
	protected $templateParser;

	/**
	 * @inheritDoc
	 */
	public function __construct(
		$name = 'MediaSearch',
		ApiBase $api = null,
		TemplateParser $templateParser = null
	) {
		parent::__construct( $name, 'mediasearch' );

		$this->api = $api ?: new ApiMain( new FauxRequest() );
		$this->templateParser = $templateParser ?: new MustacheDomTemplateParser(
			__DIR__ . '/../../templates/mediasearch'
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription() {
		return $this->msg( 'wikibasemediainfo-special-mediasearch-title' )->parse();
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		OutputPage::setupOOUI();

		// url & querystring params of this page
		$url = $this->getContext()->getRequest()->getRequestURL();
		parse_str( parse_url( $url, PHP_URL_QUERY ), $querystring );

		$term = str_replace( "\n", " ", $this->getRequest()->getText( 'q' ) );
		$type = $querystring['type'] ?? 'bitmap';
		$limit = $this->getRequest()->getText( 'limit' ) ? (int)$this->getRequest()->getText( 'limit' ) : 40;

		list( $results, $continue ) = $this->search(
			$term,
			$type,
			$limit,
			$this->getRequest()->getText( 'continue' )
		);

		$totalSiteImages = (int)SiteStats::images();

		$data = [
			'querystring' => array_map( function ( $key, $value ) {
				return [
					'key' => $key,
					'value' => $value,
					'is' . ucfirst( $key ) => true,
				];
			}, array_keys( $querystring ), array_values( $querystring ) ),
			'page' => $url,
			'path' => parse_url( $url, PHP_URL_PATH ),
			'term' => $term,
			'hasTerm' => (bool)$term,
			'limit' => $limit,
			'activeType' => $type,
			'tabs' => [
				[
					'type' => 'bitmap',
					'label' => $this->msg( 'wikibasemediainfo-special-mediasearch-tab-bitmap' )->text(),
					'isActive' => $type === 'bitmap',
					'isBitmap' => true,
				],
				[
					'type' => 'audio',
					'label' => $this->msg( 'wikibasemediainfo-special-mediasearch-tab-audio' )->text(),
					'isActive' => $type === 'audio',
					'isAudio' => true,
				],
				[
					'type' => 'video',
					'label' => $this->msg( 'wikibasemediainfo-special-mediasearch-tab-video' )->text(),
					'isActive' => $type === 'video',
					'isVideo' => true,
				],
				[
					'type' => 'category',
					'label' => $this->msg( 'wikibasemediainfo-special-mediasearch-tab-category' )->text(),
					'isActive' => $type === 'category',
					'isCategory' => true,
				],
			],
			'results' => array_map( function ( $result ) {
				$title = Title::newFromDBkey( $result['title'] );
				$filename = $title ? $title->getText() : $result['title'];
				return $result + [ 'name' => $filename ];
			}, $results ),
			'continue' => $continue,
			'hasMore' => $continue !== null,
			'searchLabel' => $this->msg( 'wikibasemediainfo-special-mediasearch-input-label' )->text(),
			'searchButton' => $this->msg( 'searchbutton' )->text(),
			'searchPlaceholder' => $this->msg( 'wikibasemediainfo-special-mediasearch-input-placeholder' )->text(),
			'continueMessage' => $this->msg( 'wikibasemediainfo-special-mediasearch-load-more-results' )->text(),
			'emptyMessage' => $this->msg( 'wikibasemediainfo-special-mediasearch-empty-state', $totalSiteImages )->text(),
			'noResultsMessage' => $this->msg( 'wikibasemediainfo-special-mediasearch-no-results' )->text(),
			'noResultsMessageExtra' => $this->msg( 'wikibasemediainfo-special-mediasearch-no-results-tips' )->text(),
		];

		$this->getOutput()->addHTML( $this->templateParser->processTemplate( 'SERPWidget', $data ) );
		$this->getOutput()->addModuleStyles( [ 'wikibase.mediainfo.mediasearch.vue.styles' ] );
		$this->getOutput()->addModules( [ 'wikibase.mediainfo.mediasearch.vue' ] );
		$this->getOutput()->addJsConfigVars( [
			'wbmiInitialSearchResults' => $data,
			'wbmiTotalSiteImages' => $totalSiteImages,
		] );

		return parent::execute( $subPage );
	}

	/**
	 * @param string $term
	 * @param string|null $type
	 * @param int|null $limit
	 * @param string|null $continue
	 * @return array [ search results, continuation value ]
	 * @throws \MWException
	 */
	protected function search( $term, $type = null, $limit = null, $continue = null ): array {
		Assert::parameterType( 'string', $term, '$term' );
		Assert::parameterType( 'string|null', $type, '$type' );
		Assert::parameterType( 'integer|null', $limit, '$limit' );
		Assert::parameterType( 'string|null', $continue, '$continue' );

		if ( $term === '' ) {
			return [ [], null ];
		}

		$langCode = $this->getContext()->getLanguage()->getCode();

		if ( $type === 'category' ) {
			$request = new FauxRequest( [
				'format' => 'json',
				'uselang' => $langCode,
				'action' => 'query',
				'generator' => 'search',
				'gsrsearch' => $term,
				'gsrnamespace' => NS_CATEGORY,
				'gsrlimit' => $limit,
				'gsroffset' => $continue ?: 0,
				'prop' => 'info',
				'inprop' => 'url',
			] );
		} else {
			$filetype = $type;
			if ( $type === 'bitmap' ) {
				$filetype .= '|drawing';
			}

			$request = new FauxRequest( [
				'format' => 'json',
				'uselang' => $langCode,
				'action' => 'query',
				'generator' => 'mediasearch',
				'gmssearch' => $term,
				'gmsrawsearch' => $filetype ? "filetype:$filetype" : '',
				'gmslimit' => $limit,
				'gmscontinue' => $continue,
				'prop' => 'info|imageinfo|pageterms',
				'inprop' => 'url',
				'iiprop' => 'url|size|mime',
				'iiurlheight' => $type === 'bitmap' ? 180 : null,
				'iiurlwidth' => $type === 'video' ? 200 : null,
				'wbptterms' => 'label',
			] );
		}

		// Local results (real)
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$this->api->setContext( $context );
		$this->api->execute();
		$response = $this->api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );

		// Pull data from commons: for use in testing
		// $url = 'https://commons.wikimedia.org/w/api.php?' . http_build_query( $request->getQueryValues() );
		// $request = \MediaWiki\MediaWikiServices::getInstance()->getHttpRequestFactory()->create( $url, [], __METHOD__ );
		// $request->execute();
		// $data = $request->getContent();
		// $response = json_decode( $data, true ) ?: [];

		$results = array_values( $response['query']['pages'] ?? [] );
		$continue = $response['continue']['gmscontinue'] ?? $response['continue']['gsroffset'] ?? null;

		uasort( $results, function ( $a, $b ) {
			return $a['index'] <=> $b['index'];
		} );

		return [ $results, $continue ];
	}

}
