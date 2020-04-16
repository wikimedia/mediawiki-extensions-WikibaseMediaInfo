<?php

namespace Wikibase\MediaInfo\Special;

use ApiBase;
use ApiMain;
use DerivativeContext;
use FauxRequest;
use MediaWiki\Widget\SearchInputWidget;
use OOUI\ActionFieldLayout;
use OOUI\ButtonInputWidget;
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

		$term = str_replace( "\n", " ", $this->getRequest()->getText( 'q' ) );
		$limit = $this->getRequest()->getText( 'limit' ) ? (int)$this->getRequest()->getText( 'limit' ) : 40;
		list( $results, $continue ) = $this->search(
			$term,
			$limit,
			$this->getRequest()->getText( 'continue' )
		);
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

		$nextButton = new ButtonInputWidget( [
			'type' => 'submit',
			'label' => $this->msg( 'wikibasemediainfo-special-mediasearch-continue' )->text(),
			'flags' => [ 'progressive' ]
		] );

		// url & querystring params of this page (for form to submit to)
		$url = $this->getPageTitle()->getLinkURL();
		parse_str( parse_url( $url, PHP_URL_QUERY ), $querystring );

		$this->getOutput()->addHTML(
			$this->templateParser->processTemplate(
				'SERPWidget',
				[
					'page' => $url,
					'querystring' => array_map( function ( $key, $value ) {
						return [ 'key' => $key, 'value' => $value ];
					}, array_keys( $querystring ), array_values( $querystring ) ),
					'term' => $term,
					'results' => array_map( function ( $result ) {
						$title = Title::newFromDBkey( $result['title'] );
						$filename = $title ? $title->getText() : $result['title'];
						return $result + [ 'name' => pathinfo( $filename, PATHINFO_FILENAME ) ];
					}, $results ),
					'limit' => $limit,
					'continue' => $continue,
					'inputWidget' => $inputWidget,
					'nextButton' => $nextButton,
					'notice' => $this->msg( 'wikibasemediainfo-special-mediasearch-notice' )->text(),
				]
			)
		);

		$this->getOutput()->addModuleStyles( [
			'oojs-ui-core.styles',
			'oojs-ui-core.icons',
			'wikibase.mediainfo.mediasearch.styles'
		] );
		$this->getOutput()->addModules( [ 'wikibase.mediainfo.mediasearch' ] );
		$this->getOutput()->addJsConfigVars( [ 'wbmiInitialSearchResults' => $results ] );

		return parent::execute( $subPage );
	}

	/**
	 * @param string $term
	 * @param int|null $limit
	 * @param string|null $continue
	 * @return array [ search results, continuation value ]
	 * @throws \MWException
	 */
	protected function search( $term, $limit = null, $continue = null ): array {
		Assert::parameterType( 'string', $term, '$term' );
		Assert::parameterType( 'integer|null', $limit, '$limit' );
		Assert::parameterType( 'string|null', $continue, '$continue' );

		if ( $term === '' ) {
			return [ [], null ];
		}

		$langCode = $this->getContext()->getLanguage()->getCode();

		$request = new FauxRequest( [
			'format' => 'json',
			'uselang' => $langCode,
			'action' => 'query',
			'generator' => 'mediasearch',
			'gmssearch' => $term,
			'gmslimit' => $limit,
			'gmscontinue' => $continue,
			'prop' => 'info|imageinfo|pageterms',
			'inprop' => 'url',
			'iiprop' => 'url|size',
			'iiurlheight' => 200,
			'wbptterms' => 'label',
		] );
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$this->api->setContext( $context );
		$this->api->execute();

		$response = $this->api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );
		$results = array_values( $response['query']['pages'] ?? [] );
		$continue = $response['continue']['gmscontinue'] ?? null;

		uasort( $results, function ( $a, $b ) {
			return $a['index'] <=> $b['index'];
		} );

		return [ $results, $continue ];
	}

}
