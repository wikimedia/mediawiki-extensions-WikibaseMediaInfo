( function ( statements, wb ) {

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
		this.id = data.id;
		this.emit( 'choose', this, data );
	};

	/**
	 * @param {wb.datamodel.EntityId|undefined} data
	 */
	statements.ItemInputWidget.prototype.setData = function ( data ) {
		var self = this;

		if ( data instanceof wb.datamodel.EntityId ) {
			this.formatValue( data, 'text/plain' ).then( function ( plain ) {
				self.id = data.toJSON().id;
				self.setValue( plain );
			} );
		} else {
			this.id = undefined;
			this.setValue( '' );
		}
	};

	/**
	 * @return {wb.datamodel.EntityId}
	 */
	statements.ItemInputWidget.prototype.getData = function () {
		return new wb.datamodel.EntityId( this.id );
	};

}( mw.mediaInfo.statements, wikibase ) );
