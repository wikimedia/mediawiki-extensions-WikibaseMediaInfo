( function ( search ) {

	'use strict';

	search.SearchWidget = function MediaInfoSearchSearchWidget( config ) {
		search.SearchWidget.parent.call( this, $.extend( {}, config, {
			classes: [ 'wbmi-search-widget' ]
		} ) );

		this.input = new search.SearchInputWidget( $.extend( { type: 'keywords' }, config ) );
		this.dropdown = new search.SelectInputWidget( { options: mw.config.get( 'wbmiSearchFiletypes' ) } );
		this.button = new OO.ui.ButtonInputWidget( {
			classes: [ 'wbmi-search-button' ],
			type: 'submit',
			icon: 'search',
			title: mw.message( 'wikibasemediainfo-search-search' ).text(),
			flags: [ 'primary', 'progressive' ]
		} );

		this.input.connect( this, { enter: 'onSubmit' } );
		this.button.connect( this, { click: 'onSubmit' } );

		this.layout = new OO.ui.HorizontalLayout( {
			items: [ this.input, this.dropdown, this.button ]
		} );

		this.$element.append( this.layout.$element );
	};
	OO.inheritClass( search.SearchWidget, OO.ui.Widget );

	search.SearchWidget.prototype.onSubmit = function () {
		var searchTerm = this.input.getTerm(),
			selectedFileTypes = this.dropdown.findSelectedItems().map( function ( item ) {
				return item.getData();
			} ),
			fileTypesSearchTerm = selectedFileTypes.length > 0 ? 'filetype:' + selectedFileTypes.join( '|' ) : '',
			url = mw.Title.makeTitle( -1, 'Search' ).getUrl( {
				search: searchTerm + ' ' + fileTypesSearchTerm,
				fulltext: 1,
				profile: 'images'
			} );

		window.location.replace( url );
	};

}( mw.mediaInfo.search ) );
