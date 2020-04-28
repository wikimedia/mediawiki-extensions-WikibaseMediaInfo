'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	SearchResultsWidget;

/**
 * @constructor
 * @param {Object} config
 * @param {string} config.term
 * @param {number} config.limit
 * @param {string} config.continue
 * @param {Array} [config.results]
 * @param {Array} [config.hasMore]
 */
SearchResultsWidget = function MediaInfoMediaSearchSearchResultsWidget( config ) {
	this.state = {
		term: config.term,
		limit: config.limit,
		continue: config.continue,
		results: ( config.results || [] ).sort( function ( a, b ) {
			return a.index - b.index;
		} ),
		hasMore: true
	};

	SearchResultsWidget.parent.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.mediasearch',
		'templates/mediasearch/SearchResultsWidget.mustache+dom'
	);
};
OO.inheritClass( SearchResultsWidget, OO.ui.Widget );
OO.mixinClass( SearchResultsWidget, ComponentWidget );

/**
 * @inheritDoc
 */
SearchResultsWidget.prototype.getTemplateData = function () {
	return {
		term: this.state.term,
		limit: this.state.limit,
		continue: this.state.continue,
		results: this.state.results.map( function ( result ) {
			return $.extend( {}, result, {
				name: new mw.Title( result.title ).getNameText()
			} );
		} )
	};
};

/**
 * @return {jQuery.Promise}
 */
SearchResultsWidget.prototype.fetchMore = function () {
	var self = this;

	return new mw.Api().get( {
		format: 'json',
		uselang: mw.config.get( 'wgUserLanguage' ),
		action: 'query',
		generator: 'mediasearch',
		gmssearch: this.state.term,
		gmslimit: this.state.limit,
		gmscontinue: this.state.continue,
		prop: 'info|imageinfo|pageterms',
		inprop: 'url',
		iiprop: 'url|size',
		iiurlheight: 180,
		wbptterms: 'label'
	} ).then( function ( response ) {
		var pages = response.query && response.query.pages || [],
			results = Object.keys( pages ).map( function ( key ) {
				return pages[ key ];
			} );

		results.sort( function ( a, b ) {
			return a.index - b.index;
		} );

		return self.setState( {
			results: self.state.results.concat( results ),
			continue: response.continue && response.continue.gmscontinue || undefined,
			hasMore: results.length === self.state.limit
		} );
	} );
};

/**
 * @return {boolean}
 */
SearchResultsWidget.prototype.hasMore = function () {
	return this.state.hasMore;
};

module.exports = SearchResultsWidget;
