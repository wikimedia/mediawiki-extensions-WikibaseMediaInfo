'use strict';

/**
 * @param {Object} [config]
 * @param {number} [config.limit] number of results to show (defaults to 7)
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
		// eslint-disable-next-line mediawiki/class-doc
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
	var input = this.getValue(),
		lastWordRegex = /[^\s]+$/,
		lastWord = input.match( lastWordRegex ),
		promises = [],
		inputPromise,
		lastWordPromise;

	if ( input.length === 0 ) {
		return $.Deferred().resolve( [] ).promise( { abort: function () {} } );
	}

	inputPromise = this.getLookupRequestForTerm( input );
	promises.push(
		inputPromise.then( function ( response ) {
			return response.search.map( function ( result ) {
				// get search term that matched (could be label or alias or...)
				return result.match.text;
			} );
		} ).promise( { abort: inputPromise.abort } )
	);

	if ( lastWord && lastWord[ 0 ] && input !== lastWord[ 0 ] ) {
		lastWordPromise = this.getLookupRequestForTerm( lastWord[ 0 ] );
		promises.push(
			lastWordPromise.then( function ( response ) {
				return response.search.map( function ( result ) {
					// add search term to rest of the input
					return input.replace( lastWordRegex, result.match.text );
				} );
			} ).promise( { abort: lastWordPromise.abort } )
		);
	}

	return $.when.apply( $, promises )
		.then( function () {
			// combine the results of multiple API calls
			return [].slice.call( arguments ).reduce( function ( combined, results ) {
				return combined.concat( results );
			}, [] );
		} ).promise( { abort: function () {
			promises.forEach( function ( promise ) {
				promise.abort();
			} );
		} } );
};

/**
 * @inheritdoc
 */
AutocompleteSearchInputWidget.prototype.getLookupRequestForTerm = function ( term ) {
	var api = wikibase.api.getLocationAgnosticMwApi( this.apiUri );

	return api.get( {
		action: 'wbsearchentities',
		search: term,
		format: 'json',
		language: mw.config.get( 'wgUserLanguage' ),
		uselang: mw.config.get( 'wgUserLanguage' ),
		type: 'item',
		// request more than `limit`, so we can omit duplicates
		limit: this.limit + 50
	} );
};

/**
 * @inheritdoc
 */
AutocompleteSearchInputWidget.prototype.getLookupCacheDataFromResponse = function ( response ) {
	return response;
};

/**
 * @inheritdoc
 */
AutocompleteSearchInputWidget.prototype.getLookupMenuOptionsFromData = function ( data ) {
	var input = this.getValue(),
		words = input.match( /[^\s]+/g ).length,
		inputRegex = new RegExp( '^' + new Array( words + 1 ).join( '[^\\s]+\\s*' ), 'i' );

	return data
		.map( function ( result ) {
			// only suggest completion for the word currently being typed
			return result.match( inputRegex )[ 0 ];
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
