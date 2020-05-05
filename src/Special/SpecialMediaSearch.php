<?php

namespace Wikibase\MediaInfo\Special;

use ApiBase;
use ApiMain;
use DerivativeContext;
use FauxRequest;
use MediaWiki\Widget\SearchInputWidget;
use OOUI\ActionFieldLayout;
use OOUI\ButtonInputWidget;
use OOUI\HtmlSnippet;
use OOUI\IndexLayout;
use OOUI\TabPanelLayout;
use OOUI\Tag;
use OutputPage;
use RequestContext;
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

		$data = [
			'page' => $url,
			'path' => parse_url( $url, PHP_URL_PATH ),
			'querystring' => $querystring,
			'term' => $term,
			'type' => $type,
			'limit' => $limit,
		];
		$emptyTabData = $data + [
			'results' => [],
			'continue' => '',
			'hasMore' => true,
		];
		$activeTabData = $data + [
			'results' => array_map( function ( $result ) {
				$title = Title::newFromDBkey( $result['title'] );
				$filename = $title ? $title->getText() : $result['title'];
				return $result + [ 'name' => $filename ];
			}, $results ),
			'continue' => $continue,
			'hasMore' => count( $results ) >= $limit,
		];
		$tabs = [
			'bitmap' => $type === 'bitmap' ? $activeTabData : $emptyTabData,
			'audio' => $type === 'audio' ? $activeTabData : $emptyTabData,
			'video' => $type === 'video' ? $activeTabData : $emptyTabData,
			'category' => $type === 'category' ? $activeTabData : $emptyTabData,
		];

		$inputWidget = new ActionFieldLayout(
			new SearchInputWidget( [
				'classes' => [ 'wbmi-special-search--input' ],
				'name' => 'q',
				'autocomplete' => false,
				'autofocus' => trim( $term ) === '',
				'value' => $term,
				'dataLocation' => 'content',
				// should not be infused, JS will just take over entirely, replacing
				// it with a new (autocompleting API results) element
				'infusable' => false,
			] ),
			new ButtonInputWidget( [
				'type' => 'submit',
				'label' => $this->msg( 'searchbutton' )->text(),
				'flags' => [ 'progressive', 'primary' ],
			] ),
			[ 'align' => 'top' ]
		);

		$this->getOutput()->addHTML( $this->templateParser->processTemplate(
			'SERPWidget',
			$data + [
				'querystring' => array_map( function ( $key, $value ) {
					return [ 'key' => $key, 'value' => $value ];
				}, array_keys( $querystring ), array_values( $querystring ) ),
				'inputWidget' => $inputWidget,
				'tabs' => $this->renderTabs( $tabs ),
			]
		) );
		$this->getOutput()->addModuleStyles( [
			'oojs-ui-core.styles',
			'oojs-ui-core.icons',
			'oojs-ui-widgets.styles',
			'wikibase.mediainfo.mediasearch.styles'
		] );
		$this->getOutput()->addModules( [ 'wikibase.mediainfo.mediasearch' ] );
		$this->getOutput()->addJsConfigVars( [ 'wbmiInitialSearchResults' => $tabs ] );

		return parent::execute( $subPage );
	}

	/**
	 * @param array $tabs
	 * @return string
	 */
	protected function renderTabs( array $tabs ): string {
		$layout = new IndexLayout( [
			'classes' => [ 'wbmi-special-search--tabs' ],
			'autoFocus' => false,
			'framed' => false,
			'expanded' => false,
		] );

		foreach ( $tabs as $name => $data ) {
			$nextButton = new ButtonInputWidget( [
				'type' => 'submit',
				'label' => $this->msg( 'wikibasemediainfo-special-mediasearch-continue' )->text(),
				'flags' => [ 'progressive' ]
			] );

			$layout->addTabPanels( [
				new TabPanelLayout(
					$name,
					[
						'label' => new HtmlSnippet(
							( new Tag( 'a' ) )
								->setAttributes( [ 'href' => $data['path'] . '?' . http_build_query( [ 'type' => $name ] + $data['querystring'] ) ] )
								->appendContent( $this->msg( "wikibasemediainfo-special-mediasearch-tab-$name" )->text() )
								->toString()
						),
						// @todo selected is not yet supported in OOUI/PHP
						'selected' => $data['type'] === $name,
						'expanded' => false,
						'scrollable' => false,
						'content' => new HtmlSnippet(
							$this->templateParser->processTemplate(
								'SearchResultsWidget',
								$data + [
									'querystring' => array_map( function ( $key, $value ) {
										return [ 'key' => $key, 'value' => $value ];
									}, array_keys( $data['querystring'] ), array_values( $data['querystring'] ) ),
									'nextButton' => $nextButton,
									'isBitmap' => $data['type'] === 'bitmap',
									'isAudio' => $data['type'] === 'audio',
									'isVideo' => $data['type'] === 'video',
									'isCategory' => $data['type'] === 'category',
								]
							)
						),
					]
				),
			] );
		}
		$layout->setInfusable( true );

		return $layout->toString();
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
			$request = new FauxRequest( [
				'format' => 'json',
				'uselang' => $langCode,
				'action' => 'query',
				'generator' => 'mediasearch',
				'gmssearch' => $term,
				'gmsrawsearch' => $type ? "filetype:$type" : '',
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

		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$this->api->setContext( $context );
		$this->api->execute();

		$response = $this->api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );
		$results = array_values( $response['query']['pages'] ?? [] );
		$continue = $response['continue']['gmscontinue'] ?? $response['continue']['gsroffset'] ?? null;

		uasort( $results, function ( $a, $b ) {
			return $a['index'] <=> $b['index'];
		} );

		return [ $results, $continue ];
	}

}
