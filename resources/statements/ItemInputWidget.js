'use strict';

var EntityLookupElement = require( './EntityLookupElement.js' ),
	FormatValueElement = require( './FormatValueElement.js' ),
	ItemInputWidget = function MediaInfoStatementsItemInputWidget( config ) {
		ItemInputWidget.parent.call( this, $.extend( {
			placeholder: mw.message( 'wikibasemediainfo-statements-item-input-placeholder' ).text(),
			icon: 'search',
			label: mw.message( 'wikibasemediainfo-statements-item-input-label' ).text()
		}, config ) );

		EntityLookupElement.call( this, $.extend( {
			minLookupCharacters: 1,
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false,
			entityType: 'item'
		}, config ) );

		FormatValueElement.call( this, $.extend( {}, config ) );

		if ( config.entityType !== 'property' ) {
			this.setInputType( config.type || 'string' );
		}
	};
OO.inheritClass( ItemInputWidget, OO.ui.TextInputWidget );
OO.mixinClass( ItemInputWidget, EntityLookupElement );
OO.mixinClass( ItemInputWidget, FormatValueElement );

/**
 * @param {string} type 'wikibase-entityid'
 * @chainable
 * @return {ItemInputWidget}
 */
ItemInputWidget.prototype.setInputType = function ( type ) {
	if ( type === 'wikibase-entityid' ) {
		this.$element.show();
	} else {
		// don't show this input field if the data type is anything other than
		// wikibase-entityid, the only datatype this thing is equiped to deal with;
		// we'll figure out how to deal with other types later...
		this.$element.hide();
	}

	return this;
};

/**
 * @inheritdoc
 */
ItemInputWidget.prototype.onLookupMenuItemChoose = function ( item ) {
	var data = item.getData();
	this.setValue( data.label );
	this.id = data.id;
	this.emit( 'choose', this, data );
};

/**
 * @param {wikibase.datamodel.EntityId|undefined} data
 */
ItemInputWidget.prototype.setData = function ( data ) {
	var self = this;

	if ( data instanceof wikibase.datamodel.EntityId ) {
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
 * @return {wikibase.datamodel.EntityId}
 */
ItemInputWidget.prototype.getData = function () {
	return new wikibase.datamodel.EntityId( this.id );
};

module.exports = ItemInputWidget;
