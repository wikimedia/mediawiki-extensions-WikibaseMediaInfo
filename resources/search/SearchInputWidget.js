( function ( search ) {

	'use strict';

	search.SearchInputWidget = function MediaInfoSearchSearchInputWidget( config ) {
		search.SearchInputWidget.parent.call( this, $.extend( {}, config, {
			classes: [ 'wbmi-search-input' ]
		} ) );

		this.config = $.extend( {}, config );
		this.defaultType = config.type || 'keywords';

		this.toggle = new OO.ui.TabSelectWidget( {
			classes: [ 'wbmi-search-input-toggle' ],
			items: [
				new OO.ui.TabOptionWidget( {
					data: 'keywords',
					label: mw.message( 'wikibasemediainfo-search-toggle-keywords' ).text(),
					framed: false
				} ),
				new OO.ui.TabOptionWidget( {
					data: 'depicts',
					label: mw.message( 'wikibasemediainfo-search-toggle-depicts' ).text(),
					framed: false
				} )
				/*
				// @todo other statements are not yet properly supported, so we're not
				// going to expose that search option just yet...
				new OO.ui.TabOptionWidget( {
					data: 'statements',
					label: mw.message( 'wikibasemediainfo-search-toggle-statements' ).text(),
					framed: false
				} )
				*/
			]
		} );
		this.toggle.connect( this, { select: 'onToggleChange' } );

		OO.ui.mixin.PopupElement.call( this, $.extend( {}, config, {
			popup: {
				classes: [ 'wbmi-search-input-toggle-popup' ],
				anchor: false,
				autoClose: false,
				$floatableContainer: this.$element,
				$content: this.toggle.$element
			}
		} ) );
		this.$element.append( this.popup.$element );

		this.setInputType( this.defaultType );
	};
	OO.inheritClass( search.SearchInputWidget, OO.ui.Widget );
	OO.mixinClass( search.SelectInputWidget, OO.ui.mixin.PopupElement );

	/**
	 * @inheritdoc
	 */
	search.SearchInputWidget.prototype.getTerm = function () {
		return this.input.getTerm();
	};

	search.SearchInputWidget.prototype.onInputChange = function () {
		this.emit( 'change' );

		// popup size/position may need updating now that input has changed
		this.popup.setSize( this.$element.innerWidth() );
	};

	search.SearchInputWidget.prototype.onInputFocus = function () {
		this.popup.setSize( this.$element.innerWidth() );
		this.popup.toggle( true );
	};

	search.SearchInputWidget.prototype.onInputBlur = function () {
		this.popup.toggle( false );
	};

	search.SearchInputWidget.prototype.onToggleChange = function () {
		var selected = this.toggle.findSelectedItem().getData();
		this.setInputType( selected );
		if ( this.input.focus ) {
			this.input.focus();
		}
		this.popup.setSize( this.$element.innerWidth() );
	};

	/**
	 * SearchInputWidget is basically a wrapper for multiple different
	 * input types - this'll let you change the input type.
	 *
	 * @param {string} type One of 'keywords', 'depicts' or 'statements'
	 * @chainable
	 */
	search.SearchInputWidget.prototype.setInputType = function ( type ) {
		if ( this.type === type ) {
			// nothing's changed, move along
			return;
		}

		// remove existing element from DOM
		if ( this.input ) {
			this.input.$element.remove();
		}

		this.type = type;

		switch ( type ) {
			case 'keywords':
				this.input = new search.KeywordsInputWidget(
					$.extend( {}, this.config, {
						classes: [ 'wbmi-search-input-input', 'wbmi-search-input-input-keywords' ],
						placeholder: mw.message( 'wikibasemediainfo-search-input-placeholder-keywords' ).text(),
						$container: this.popup.$element,
						menu: { width: '100%', classes: [ 'wbmi-search-input-autocomplete' ] }
					} )
				);
				break;
			case 'depicts':
				this.input = new search.DepictsInputWidget(
					$.extend( {}, this.config, {
						classes: [ 'wbmi-search-input-input', 'wbmi-search-input-input-depicts' ],
						placeholder: mw.message( 'wikibasemediainfo-search-input-placeholder-depicts' ).text(),
						$container: this.popup.$element,
						menu: { width: '100%', classes: [ 'wbmi-search-input-autocomplete' ] }
					} )
				);
				break;
			case 'statements':
				this.input = new search.StatementsInputWidget(
					$.extend( {}, this.config, {
						classes: [ 'wbmi-search-input-input', 'wbmi-search-input-input-statements' ],
						placeholder: mw.message( 'wikibasemediainfo-search-input-placeholder-statements' ).text(),
						$container: this.popup.$element,
						menu: { width: '100%', classes: [ 'wbmi-search-input-autocomplete' ] }
					} )
				);
				break;
			default:
				throw new Error( 'Unsupported search input value type: ' + type );
		}

		this.input.connect( this, {
			change: 'onInputChange',
			enter: [ 'emit', 'enter' ],
			cancel: [ 'setInputType', this.defaultType ],
			focus: 'onInputFocus',
			blur: 'onInputBlur'
		} );

		// add the new element
		this.$element.prepend( this.input.$element );

		// make sure the correct item has been selected in the toggle (for when things
		// change programmatically instead of a user selecting something from toggle)
		this.toggle.selectItem( this.toggle.findItemFromData( type ) );

		return this;
	};

	/**
	 * @return {boolean}
	 */
	search.SearchInputWidget.prototype.isDisabled = function () {
		return this.input.isDisabled();
	};

	/**
	 * @param {boolean} disabled
	 * @chainable
	 */
	search.SearchInputWidget.prototype.setDisabled = function ( disabled ) {
		if ( this.input === undefined ) {
			// ignore this call from parent constructor; input will be constructed
			// with the correct config later on
			return this;
		}

		return this.input.setDisabled( disabled );
	};

}( mw.mediaInfo.search ) );
