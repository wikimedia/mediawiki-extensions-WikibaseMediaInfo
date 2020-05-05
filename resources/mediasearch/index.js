'use strict';

var AutocompleteSearchInputWidget = require( './AutocompleteSearchInputWidget.js' ),
	SearchResultsWidget = require( './SearchResultsWidget.js' ),
	TabFilterWidget = require( './TabFilterWidget.js' ),
	// eslint-disable-next-line no-jquery/no-global-selector
	$input = $( '.wbmi-special-search--input' ),
	inputWidget = new AutocompleteSearchInputWidget( { value: $input.find( 'input' ).val() } ),
	// eslint-disable-next-line no-jquery/no-global-selector
	$tabs = $( '.wbmi-special-search--tabs' ),
	tabs = OO.ui.infuse( $tabs ),
	uri = new mw.Uri( window.location.href, { overrideKeys: true } ),
	initialSearchResults = mw.config.get( 'wbmiInitialSearchResults', {} ),
	searchResultsWidgets = [],
	tabsWithResolutionFilter = [ 'bitmap', 'video' ],
	sizeFilter;

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
searchResultsWidgets = tabs.getTabs().getItems().map( function ( tabOption ) {
	var type = tabOption.getData(),
		panel = tabs.getTabPanel( type ),
		$searchResults = panel.$element.find( '.wbmi-special-search' ),
		$continue = panel.$element.find( '.wbmi-special-search--continue' ),
		hasMore = $continue.length > 0,
		searchResultsWidget = new SearchResultsWidget( {
			term: $continue.find( '[name=q]' ).val() || uri.query.q || '',
			type: type,
			limit: parseInt( $continue.find( '[name=limit]' ).val() ) || 0,
			continue: $continue.find( '[name=continue]' ).val() || undefined,
			results: Object.keys( initialSearchResults[ type ].results ).map( function ( key ) {
				return initialSearchResults[ type ].results[ key ];
			} ),
			hasMore: hasMore
		} ),
		maybeLoadMore = function () {
			var isActive = tabs.getCurrentTabPanelName() === searchResultsWidget.getType(),
				hasMore = searchResultsWidget.hasMore(),
				spinnerPosition = searchResultsWidget.$element.find( '.wbmi-special-search--continue' ).position(),
				isSpinnerVisible = spinnerPosition.top < $( window ).scrollTop() + $( window ).height();

			if ( !isActive || !hasMore || !isSpinnerVisible ) {
				return;
			}

			// fetch results, and immediately check if we need another fetch,
			// for those massive screens where the new content *still* didn't
			// push the spinner off-screen
			searchResultsWidget.fetchMore().then( maybeLoadMore );
		};

	searchResultsWidget.render().then( function ( $element ) {
		$searchResults.replaceWith( $element );

		// see if we need to load more results:
		// - immediately for selected tab
		// - when tab becomes selected
		// - on scroll
		$( window ).on( 'scroll.wbmi-special-search-' + type, OO.ui.throttle( maybeLoadMore, 1000 ) );
		panel.on( 'active', function ( active ) {
			if ( active ) {
				maybeLoadMore();
			}
		} );
		if ( tabs.getCurrentTabPanelName() === searchResultsWidget.getType() ) {
			maybeLoadMore();
		}
	} );

	return searchResultsWidget;
} );

// add a "filter by size" option to the tabs
// this is a bit of a hack & not natively supported by OOUI
// so this is a JavaScript-only feature (for now)
sizeFilter = new TabFilterWidget( {
	label: $( '<span>' )
		.text( mw.msg( 'wikibasemediainfo-special-mediasearch-filter-size' ) )
		.append( new OO.ui.IndicatorWidget( { indicator: 'down' } ).$element ),
	menu: {
		items: [
			new OO.ui.MenuOptionWidget( { data: '', label: mw.msg( 'wikibasemediainfo-special-mediasearch-filter-size-any' ), selected: true } ),
			new OO.ui.MenuOptionWidget( { data: '<500', label: mw.msg( 'wikibasemediainfo-special-mediasearch-filter-size-small' ) } ),
			new OO.ui.MenuOptionWidget( { data: '500,1000', label: mw.msg( 'wikibasemediainfo-special-mediasearch-filter-size-medium' ) } ),
			new OO.ui.MenuOptionWidget( { data: '>1000', label: mw.msg( 'wikibasemediainfo-special-mediasearch-filter-size-large' ) } )
		]
	}
} );
sizeFilter.on( 'select', function ( option ) {
	searchResultsWidgets.forEach( function ( searchResultsWidget ) {
		var promise;

		if ( tabsWithResolutionFilter.indexOf( searchResultsWidget.getType() ) < 0 ) {
			// size filter only applies to certain types - don't apply filter to others
			return;
		}

		promise = searchResultsWidget.setResolution( option.getData() );

		// go fetch results matching the filter in the active tab
		if ( tabs.getCurrentTabPanelName() === searchResultsWidget.getType() ) {
			promise.then( searchResultsWidget.fetchMore.bind( searchResultsWidget ) );
		}
	} );
} );
tabs.on( 'set', function ( tab ) {
	// size filter only applies to certain types - disable it when in another tab
	sizeFilter.setDisabled( tabsWithResolutionFilter.indexOf( tab.getName() ) < 0 );
} );
tabs.tabSelectWidget.addItems( [ sizeFilter ] );

module.exports = {
	AutocompleteSearchInputWidget: AutocompleteSearchInputWidget
};
