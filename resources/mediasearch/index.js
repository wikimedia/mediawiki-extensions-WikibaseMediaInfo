'use strict';

var AutocompleteSearchInputWidget = require( './AutocompleteSearchInputWidget.js' ),
	SearchResultsWidget = require( './SearchResultsWidget.js' ),
	// eslint-disable-next-line no-jquery/no-global-selector
	$input = $( '.wbmi-special-search--input' ),
	inputWidget = new AutocompleteSearchInputWidget( { value: $input.find( 'input' ).val() } ),
	// eslint-disable-next-line no-jquery/no-global-selector
	$searchResults = $( '.wbmi-special-search' ),
	// eslint-disable-next-line no-jquery/no-global-selector
	$continue = $( '.wbmi-special-search--continue' ),
	uri = new mw.Uri( window.location.href, { overrideKeys: true } ),
	initialSearchResults = mw.config.get( 'wbmiInitialSearchResults', {} ),
	hasMore = $continue.length > 0,
	newSearchResultsWidget = new SearchResultsWidget( {
		term: $continue.find( '[name=q]' ).val() || uri.query.q,
		limit: parseInt( $continue.find( '[name=limit]' ).val() ) || 0,
		continue: $continue.find( '[name=continue]' ).val() || undefined,
		results: Object.keys( initialSearchResults ).map( function ( key ) {
			return initialSearchResults[ key ];
		} ),
		hasMore: hasMore
	} );

// replace simple search input field with a similar autocompleting version
$input.replaceWith( inputWidget.$element );
inputWidget.on( 'choose', function () {
	inputWidget.$element.parents( 'form' ).trigger( 'submit' );
} );

// replace search results & 'next' button with infinite scroll
newSearchResultsWidget.render().then( function ( $element ) {
	var fetching = false;

	$searchResults.replaceWith( $element );
	$continue.empty().append( $.createSpinner( { size: 'large' } ) );

	$( window ).on( 'scroll.wbmi-mediasearch', OO.ui.throttle( function () {
		if ( !fetching && hasMore && $( window ).scrollTop() + $( window ).height() > $( document ).height() - 500 ) {
			fetching = true;
			newSearchResultsWidget.fetchMore().then( function () {
				fetching = false;
				hasMore = newSearchResultsWidget.hasMore();
				if ( !hasMore ) {
					$continue.remove();
					$( window ).off( 'scroll.wbmi-mediasearch' );
				}
			} );
		}
	}, 1000 ) );
} );

module.exports = {
	AutocompleteSearchInputWidget: AutocompleteSearchInputWidget
};
