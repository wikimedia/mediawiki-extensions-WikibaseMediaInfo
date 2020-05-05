'use strict';

/**
 * @param {Object} [config]
 * @param {int} [config.limit] number of results to show (defaults to 7)
 */
var AutocompleteSearchInputWidget = function MediaInfoMediaSearchAutocompleteSearchInputWidget( config ) {
	config = config || {};

	this.apiUri =
		mw.config.get( 'wbmiExternalEntitySearchBaseUri' ) ||
		mw.config.get( 'wbmiRepoApiUrl' ) ||
		mw.config.get( 'wbRepoApiUrl' );

	this.limit = config.limit || 7;

	AutocompleteSearchInputWidget.parent.call(
		this,
		$.extend( {}, config, {
			name: 'q',
			// disable browser autocomplete (we'll have our own suggestions)
			autocomplete: false,
			// classes should *always* be added, because some essential functionality
			// (e.g. CSS to turn red on invalid input) depends on these classes
			classes: [ 'wbmi-special-search--input' ].concat( config.classes || [] )
		} )
	);

	OO.ui.mixin.LookupElement.call(
		this,
		$.extend( {}, {
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false
		}, config )
	);
};
OO.inheritClass( AutocompleteSearchInputWidget, OO.ui.SearchInputWidget );
OO.mixinClass( AutocompleteSearchInputWidget, OO.ui.mixin.LookupElement );

/**
 * @inheritdoc
 */
AutocompleteSearchInputWidget.prototype.onLookupMenuChoose = function ( item ) {
	OO.ui.mixin.LookupElement.prototype.onLookupMenuChoose.call( this, item );
	this.emit( 'choose', item.getData() );
};

/**
 * @inheritdoc
 */
AutocompleteSearchInputWidget.prototype.getLookupRequest = function () {
	var value = this.getValue(),
		deferred = $.Deferred(),
		api = wikibase.api.getLocationAgnosticMwApi( this.apiUri ),
		requestParams = {
			action: 'wbsearchentities',
			search: value,
			format: 'json',
			language: mw.config.get( 'wgUserLanguage' ),
			uselang: mw.config.get( 'wgUserLanguage' ),
			type: 'item',
			// request more than `limit`, so we can omit duplicates
			limit: this.limit + 25
		};

	if ( value.length === 0 ) {
		return deferred.resolve( [] ).promise( { abort: function () {} } );
	}

	return api.get( requestParams );
};

/**
 * @inheritdoc
 */
AutocompleteSearchInputWidget.prototype.getLookupCacheDataFromResponse = function ( response ) {
	return response.search;
};

/**
 * @inheritdoc
 */
AutocompleteSearchInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	return data
		.map( function ( result ) {
			// get search term that matched (could be label or alias or...)
			return result.match.text;
		} )
		.filter( function ( value, i, array ) {
			// filter for unique values
			// could do a simple `indexOf` to see if a value already exists,
			// but that'd be case-sensitive; and since case doesn't matter for
			// search terms, we shouldn't be showing the same term in different
			// capitalization if it's going to give the same results
			return !array.slice( 0, i ).some( function ( previousValue ) {
				return previousValue.toLowerCase() === value.toLowerCase();
			} );
		} )
		.slice( 0, this.limit )
		.map( function ( term ) {
			return new OO.ui.MenuOptionWidget( {
				// this data will be passed to onLookupMenuChoose when item is selected
				data: term,
				label: term
			} );
		} );
};

module.exports = AutocompleteSearchInputWidget;
