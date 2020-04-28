'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	SearchResultsWidget;

/**
 * @constructor
 * @param {Object} config
 * @param {string} config.term
 * @param {string} config.type
 * @param {number} config.limit
 * @param {string} config.continue
 * @param {Array} [config.results]
 * @param {Array} [config.hasMore]
 */
SearchResultsWidget = function MediaInfoMediaSearchSearchResultsWidget( config ) {
	this.state = {
		term: config.term,
		type: config.type,
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
		hasMore: this.state.hasMore,
		results: this.state.results.map( function ( result ) {
			return $.extend( {}, result, {
				name: new mw.Title( result.title ).getMainText()
			} );
		} ),
		isBitmap: this.state.type === 'bitmap',
		isAudio: this.state.type === 'audio',
		isVideo: this.state.type === 'video',
		isCategory: this.state.type === 'category'
	};
};

/**
 * @return {jQuery.Promise}
 */
SearchResultsWidget.prototype.fetchMore = function () {
	var self = this,
		params;

	if ( this.state.term.length === 0 ) {
		return this.setState( {
			results: [],
			continue: '',
			hasMore: false
		} );
	}

	if ( this.state.type === 'category' ) {
		params = {
			format: 'json',
			uselang: mw.config.get( 'wgUserLanguage' ),
			action: 'query',
			generator: 'search',
			gsrsearch: this.state.term,
			gsrnamespace: 14, // NS_CATEGORY
			gsrlimit: this.state.limit,
			gsroffset: this.state.continue || 0,
			prop: 'info',
			inprop: 'url'
		};
	} else {
		params = {
			format: 'json',
			uselang: mw.config.get( 'wgUserLanguage' ),
			action: 'query',
			generator: 'mediasearch',
			gmssearch: this.state.term,
			gmsfiletype: this.state.type,
			gmslimit: this.state.limit,
			gmscontinue: this.state.continue,
			prop: 'info|imageinfo|pageterms',
			inprop: 'url',
			iiprop: 'url|size|mime',
			iiurlheight: this.state.type === 'bitmap' ? 180 : undefined,
			iiurlwidth: this.state.type === 'video' ? 200 : undefined,
			wbptterms: 'label'
		};
	}

	return new mw.Api().get( params ).then( function ( response ) {
		var pages = response.query && response.query.pages || [],
			results = Object.keys( pages ).map( function ( key ) {
				return pages[ key ];
			} );

		results.sort( function ( a, b ) {
			return a.index - b.index;
		} );

		return self.setState( {
			results: self.state.results.concat( results ),
			continue: response.continue ? ( response.continue.gmscontinue || response.continue.gsroffset ) : '',
			hasMore: results.length > self.state.limit && response.continue
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
