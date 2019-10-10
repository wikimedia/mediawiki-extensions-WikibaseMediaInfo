'use strict';

var FormatValueElement = require( './FormatValueElement.js' ),
	EntityLookupElement = require( './EntityLookupElement.js' ),
	ItemInputWidget;

/**
 * @constructor
 * @param {Object} [config]
 */
ItemInputWidget = function ( config ) {
	config = config || {};

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
};

OO.inheritClass( ItemInputWidget, OO.ui.TextInputWidget );
OO.mixinClass( ItemInputWidget, EntityLookupElement );
OO.mixinClass( ItemInputWidget, FormatValueElement );

/**
 * @inheritdoc
 */
ItemInputWidget.prototype.onLookupMenuItemChoose = function ( item ) {
	var data = item.getData();

	this.setValue( data.label );
	this.id = data.id;

	// TODO
	// this widget is used in two different contexts: to select properties along
	// with AddPropertyWidget, and to input items into StatementWidgets which
	// accept "wikibase-item" values.
	// Right now a different event is emitted in each context, since the
	// payloads differ. This is not ideal.
	this.emit( 'addItem', data.id );
	this.emit( 'choose', this, data );
};

module.exports = ItemInputWidget;
