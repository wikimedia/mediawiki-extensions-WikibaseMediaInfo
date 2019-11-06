'use strict';

var PropertySuggestionsWidget = require( './PropertySuggestionsWidget.js' ),
	defaultPropertyIds = Object.keys( mw.config.get( 'wbmiProperties' ) ),
	widgets = defaultPropertyIds.map( function ( propertyId ) {
		return new PropertySuggestionsWidget( { propertyId: propertyId } );
	} );

// eslint-disable-next-line no-jquery/no-global-selector
$( '#searchInput, .mw-searchInput' )
	.on( 'keydown', function ( e ) {
		// keypress event is not emitted on non-printable characters
		// (like backspace), but we do want backspace to update the
		// suggestions, so let's capture that one separately and
		// trigger an synthetic keypress
		if ( e.keyCode === 8 ) {
			$( this ).trigger( 'keypress' );
		}
	} )
	.on( 'keypress', function () {
		var input = this;

		// the input's value is not immediately available when this event gets
		// fired, but it will be at the end of the call stack, so let's wrap
		// this inside a setTimeout
		setTimeout( function () {
			var term = $( input ).val(),
				// original search results - where we want to append ours after
				// eslint-disable-next-line no-jquery/no-global-selector
				$results = $( '.suggestions .suggestions-results' ),
				i;

			// iterate widgets in reverse: we'll be appending them at the
			// same position, so the last one to get appended will be the
			// first to be displayed
			for ( i = widgets.length - 1; i >= 0; i-- ) {
				// node might already have been appended on previous keypress
				if ( $results.siblings().filter( widgets[ i ].$element ).length === 0 ) {
					widgets[ i ].$element.insertAfter( $results );
				}

				widgets[ i ].setTerm( term );
			}
		} );
	} );

module.exports = {
	PropertySuggestionsWidget: PropertySuggestionsWidget
};
