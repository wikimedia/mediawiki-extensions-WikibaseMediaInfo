( function ( statements ) {

	'use strict';

	statements.ItemInputWidget = function MediaInfoStatementsItemInputWidget( config ) {
		statements.ItemInputWidget.parent.call( this, $.extend( {
			placeholder: mw.message( 'wikibasemediainfo-statements-item-input-placeholder' ).text(),
			icon: 'search',
			label: mw.message( 'wikibasemediainfo-statements-item-input-label' ).text()
		}, config ) );

		statements.EntityLookupElement.call( this, $.extend( {}, config, {
			minLookupCharacters: 1,
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false,
			type: 'item'
		} ) );

		statements.FormatValueElement.call( this, $.extend( {}, config ) );
	};
	OO.inheritClass( statements.ItemInputWidget, OO.ui.TextInputWidget );
	OO.mixinClass( statements.ItemInputWidget, statements.EntityLookupElement );
	OO.mixinClass( statements.ItemInputWidget, statements.FormatValueElement );

	/**
	 * @inheritdoc
	 */
	statements.ItemInputWidget.prototype.onLookupMenuItemChoose = function ( item ) {
		var data = item.getData();
		this.setValue( data.label );
		this.data = data.id;
		this.emit( 'choose', this, data );
	};

	/**
	 * @param {Object} data
	 */
	statements.ItemInputWidget.prototype.setData = function ( data ) {
		if ( data.value && data.value.id ) {
			var self = this;
			this.formatValue( data, 'text/plain' ).then( function ( plain ) {
				self.data = data;
				self.setValue( plain );
			} );
		} else {
			this.data = undefined;
			this.setValue( '' );
		}
	};

	/**
	 * @return {Object}
	 */
	statements.ItemInputWidget.prototype.getData = function () {
		if ( this.data === undefined ) {
			return {};
		}

		return {
			type: 'wikibase-entityid',
			value: {
				id: this.data
			}
		};
	};

}( mw.mediaInfo.statements ) );
