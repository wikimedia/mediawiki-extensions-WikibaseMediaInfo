'use strict';

var AutocompleteSearchInputWidget = require( './AutocompleteSearchInputWidget.js' ),
	SearchResultsWidget = require( './SearchResultsWidget.js' ),
	// eslint-disable-next-line no-jquery/no-global-selector
	$input = $( '.wbmi-special-search--input' ),
	inputWidget = new AutocompleteSearchInputWidget( { value: $input.find( 'input' ).val() } ),
	// eslint-disable-next-line no-jquery/no-global-selector
	$tabs = $( '.wbmi-special-search--tabs' ),
	tabs = OO.ui.infuse( $tabs ),
	uri = new mw.Uri( window.location.href, { overrideKeys: true } ),
	initialSearchResults = mw.config.get( 'wbmiInitialSearchResults', {} );

// replace simple search input field with a similar autocompleting version
$input.replaceWith( inputWidget.$element );
inputWidget.on( 'choose', function () {
	inputWidget.$element.parents( 'form' ).trigger( 'submit' );
} );

// select the active tab
tabs.setTabPanel( uri.query.type || 'bitmap' );
// now that the tabs are interactive, we no longer need these
// links to do anything, except update the location so that
// users can copy/pase the correct link
tabs.$element.find( '.oo-ui-menuLayout-menu .oo-ui-labelElement-label a' ).on( 'click', function ( e ) {
	e.preventDefault();
	history.pushState( {}, '', e.target.href );
} );

// in every tab, replace search results & 'next' button with infinite scroll
tabs.getTabs().getItems().forEach( function ( tabOption ) {
	var type = tabOption.getData(),
		panel = tabs.getTabPanel( type ),
		$searchResults = panel.$element.find( '.wbmi-special-search' ),
		$continue = panel.$element.find( '.wbmi-special-search--continue' ),
		hasMore = $continue.length > 0,
		newSearchResultsWidget = new SearchResultsWidget( {
			term: $continue.find( '[name=q]' ).val() || uri.query.q || '',
			type: type,
			limit: parseInt( $continue.find( '[name=limit]' ).val() ) || 0,
			continue: $continue.find( '[name=continue]' ).val() || undefined,
			results: Object.keys( initialSearchResults[ type ].results ).map( function ( key ) {
				return initialSearchResults[ type ].results[ key ];
			} ),
			hasMore: hasMore
		} );

	newSearchResultsWidget.render().then( function ( $element ) {
		var isFetching = false,
			hasMore = newSearchResultsWidget.hasMore(),
			$spinner = $.createSpinner( { size: 'large' } ),
			event = 'scroll.wbmi-special-search-' + type,
			maybeLoadMore = function () {
				var isActive = tabs.getCurrentTabPanelName() === type,
					isSpinnerVisible = $spinner.position().top < $( window ).scrollTop() + $( window ).height();

				if ( isFetching || !isActive || !hasMore || !isSpinnerVisible ) {
					return;
				}

				isFetching = true;
				newSearchResultsWidget.fetchMore().then( function () {
					isFetching = false;
					hasMore = newSearchResultsWidget.hasMore();
					if ( !hasMore ) {
						$continue.remove();
						$( window ).off( event );
					}
				} );
			};

		$searchResults.replaceWith( $element );
		$continue.empty().append( $spinner );

		$( window ).on( event, OO.ui.throttle( maybeLoadMore, 1000 ) );
		tabs.on( 'set', maybeLoadMore );
	} );
} );

module.exports = {
	AutocompleteSearchInputWidget: AutocompleteSearchInputWidget
};
