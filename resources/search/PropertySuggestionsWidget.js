'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	datamodel = require( 'wikibase.datamodel' ),
	PropertySuggestionsWidget;

/**
 * Widget that will add "depicts" suggestions into the search box.
 *
 * @param {Object} config
 * @param {string} config.propertyId Id of the property to search items for (e.g. P1)
 * @param {string} [config.term] Initial term to initialize widget with
 * @param {number} [config.limit] number of results to fetch
 * @param {number} [config.disabled] number of results to fetch
 */
PropertySuggestionsWidget = function ( config ) {
	config = config || {};

	this.prefKey = 'wbmi-search-suggestions';

	this.state = {
		propertyId: config.propertyId,
		term: config.term || '',
		limit: config.limit || 7,
		enabled: Boolean( mw.user.isAnon() ?
			Number( mw.storage.get( this.prefKey ) || 1 ) :
			Number( mw.user.options.get( this.prefKey ) )
		)
	};

	PropertySuggestionsWidget.parent.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.search',
		'templates/search/PropertySuggestionsWidget.mustache+dom'
	);
	FormatValueElement.call( this, $.extend( {}, config ) );
};
OO.inheritClass( PropertySuggestionsWidget, OO.ui.Widget );
OO.mixinClass( PropertySuggestionsWidget, ComponentWidget );
OO.mixinClass( PropertySuggestionsWidget, FormatValueElement );

/**
 * @inheritDoc
 */
PropertySuggestionsWidget.prototype.getTemplateData = function () {
	var api = wikibase.api.getLocationAgnosticMwApi(
			mw.config.get( 'wbmiExternalEntitySearchBaseUri' ) ||
			mw.config.get( 'wbmiRepoApiUrl' ) ||
			mw.config.get( 'wbRepoApiUrl' )
		),
		data = {
			propertyId: this.state.propertyId,
			title: '',
			term: this.state.term,
			count: 0,
			results: [],
			closeHandler: this.onClose.bind( this ),
			enabled: this.state.enabled
		},
		promises;

	if ( !this.state.enabled || this.state.term === '' ) {
		// no need to do API calls if we know in advance that we're not going
		// to be needing them...
		return data;
	}

	promises = [
		this.getTitle( this.state.propertyId ),
		api.get( {
			action: 'wbsearchentities',
			search: this.state.term,
			format: 'json',
			language: mw.config.get( 'wgUserLanguage' ),
			uselang: mw.config.get( 'wgUserLanguage' ),
			type: 'item',
			limit: this.state.limit
		} ).then( function ( result ) {
			// `api.get` returns 2 arguments (the API result and additional xhr info)
			// and we want to discard that 2nd part before we let $.when merge these
			// 2 promise results (or this result would become a nested array)
			return result;
		} )
	];

	return $.when.apply( $, promises ).then(
		function ( title, result ) {
			return $.extend( {}, data, {
				title: title,
				count: result.search && result.search.length || 0,
				results: ( result.search || [] ).map( function ( entity ) {
					var data = $.extend( {}, entity );

					if ( entity.aliases ) {
						// pre-format aliases array into a proper textual list
						data.aliases = mw.message( 'word-separator' ).text() +
							mw.message( 'parentheses', mw.language.listToText( entity.aliases ) ).text();
					}

					return data;
				} )
			} );
		},
		function () {
			return data;
		}
	);
};

/**
 * Returns a promise that resolves with the title.
 * This defaults to the property's label, but allows for custom text via
 * `wbmiSearchTitles`
 *
 * @param {string} propertyId
 * @return {jQuery.Promise}
 */
PropertySuggestionsWidget.prototype.getTitle = function ( propertyId ) {
	var titles = mw.config.get( 'wbmiSearchTitles', {} );

	if ( propertyId in titles ) {
		return $.Deferred().resolve( titles[ propertyId ] ).promise();
	}

	return this.formatValue( new datamodel.EntityId( propertyId ), 'text/plain' );
};

/**
 * Feed a new search term.
 *
 * @param {string} term
 * @return {jQuery.Promise}
 */
PropertySuggestionsWidget.prototype.setTerm = function ( term ) {
	return this.setState( { term: term } );
};

/**
 * @param {Object} e
 */
PropertySuggestionsWidget.prototype.onClose = function ( e ) {
	var self = this;

	e.preventDefault();

	OO.ui.confirm(
		new OO.ui.HtmlSnippet( mw.message( 'wikibasemediainfo-search-suggestions-preference-disable-confirm' ).parse() ),
		{
			actions: [
				{
					action: 'accept',
					label: mw.msg( 'ooui-dialog-message-accept' ),
					flags: [ 'primary', 'destructive' ]
				},
				{
					action: 'reject',
					label: mw.msg( 'ooui-dialog-message-reject' ),
					flags: 'safe'
				}
			]
		}
	).then( function ( confirmed ) {
		if ( confirmed ) {
			// update UI
			self.setState( { enabled: false } );

			// update user preference (or localstorage, for anons)
			if ( mw.user.isAnon() ) {
				mw.storage.set( self.prefKey, '0' );
			} else {
				new mw.Api().saveOption( self.prefKey, '0' ).then( function () {
					mw.user.options.set( self.prefKey, '0' );
				} );
			}
		}
	} );

};

module.exports = PropertySuggestionsWidget;
