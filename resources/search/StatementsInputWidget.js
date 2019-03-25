( function ( search ) {

	'use strict';

	search.StatementsInputWidget = function MediaInfoSearchStatementsInputWidget( config ) {
		search.StatementsInputWidget.parent.call( this, config );
		OO.ui.mixin.PopupElement.call( this, $.extend( { popup: { autoClose: false } }, config ) );

		// create input field, but marked as disabled - the relevant stuff needs to
		// be selected in the popup, which will be opened immediately
		this.input = new OO.ui.TextInputWidget( config );
		this.input.setDisabled( true );
		this.$element.append( this.input.$element );

		this.statementsWidget = new search.QualifiersPopoverWidget( {
			properties: {}, // @todo configure which statements
			terms: {
				'': {
					'': ''
				},
				'wikibase-entityid': {
					'': '',
					is: 'haswbstatement:${property}=${value}',
					isnot: '!haswbstatement:${property}=${value}',
					isempty: '-haswbstatement:${property}'
				},
				quantity: {
					'': '',
					is: 'wbstatementquantity:${property}=${value}',
					isnot: 'wbstatementquantity:${property}>${value}|${property}<${value}',
					isempty: '-haswbstatement:${property}',
					isgreaterthan: 'wbstatementquantity:${property}>${value}',
					islessthan: 'wbstatementquantity:${property}<${value}'
				},
				string: {
					'': ''
					// searching string not yet possible...
				}
			},
			messages: {
				title: mw.message( 'wikibasemediainfo-search-statements-title' ).text(),
				intro: mw.message( 'wikibasemediainfo-search-statements-intro' ).text(),
				add: mw.message( 'wikibasemediainfo-search-statements-add' ).text(),
				cancel: mw.message( 'wikibasemediainfo-search-statements-cancel' ).text(),
				save: mw.message( 'wikibasemediainfo-search-statements-save' ).text()
			}
		} );
		this.statementsWidget.connect( this, {
			save: [ 'emit', 'enter' ],
			cancel: [ 'emit', 'cancel' ]
		} );

		this.popup.$body.append( this.statementsWidget.$element );
		this.popup.setSize( 700 );

		this.$overlay = (
			config.$overlay === true ?
				OO.ui.getDefaultOverlay() :
				config.$overlay
		) || this.$element;
		this.$overlay.append( this.popup.$element.addClass( 'wbmi-search-popover' ) );

		// wrapped inside a timer to make sure the relevant DOM elements exist before the popup
		// tries to figure out the position to attach
		setTimeout( this.popup.toggle.bind( this.popup, true ), 100 );
	};
	OO.inheritClass( search.StatementsInputWidget, OO.ui.Widget );
	OO.mixinClass( search.StatementsInputWidget, OO.ui.mixin.PopupElement );

	/**
	 * @inheritdoc
	 */
	search.StatementsInputWidget.prototype.getTerm = function () {
		return this.statementsWidget.getTerm();
	};

}( mw.mediaInfo.search ) );
