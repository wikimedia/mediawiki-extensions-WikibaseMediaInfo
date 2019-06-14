'use strict';

var ItemInputWidget = require( './ItemInputWidget.js' ),
	/**
	 * @constructor
	 * @param {Object} config
	 * @cfg {array} propertyIds An array of property ids of statements that exist on the page
	 */
	AddPropertyWidget = function MediaInfoAddPropertyWidget( config ) {
		AddPropertyWidget.parent.call(
			this,
			$.extend( config, { classes: [ 'wbmi-add-property' ] } )
		);

		this.propertyIds = config.propertyIds;

		this.addPropertyButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-entityview-add-statement-property-button' ],
			framed: true,
			icon: 'add',
			flags: [ 'progressive' ],
			label: mw.message( 'wikibasemediainfo-add-statement' ).text()
		} );
		this.addPropertyButton.connect( this, { click: 'onClick' } );

		this.inputContainer = new OO.ui.Widget( {
			classes: [ 'wbmi-entityview-add-statement-property-container' ]
		} );
		this.propertyInputWidget = new ItemInputWidget( {
			classes: [ 'wbmi-entityview-add-statement-property' ],
			entityType: 'property',
			filter: this.getFilters(),
			maxSuggestions: 7,
			placeholder: mw.message( 'wikibasemediainfo-add-property' ).text()
		} );
		this.propertyInputWidget.connect( this, { choose: 'onChoose' } );
		this.propertyInputWidget.connect( this, { choose: [ 'emit', 'choose' ] } );

		this.removeButton = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-item-remove' ],
			title: mw.message( 'wikibasemediainfo-statements-item-remove' ).text(),
			flags: 'destructive',
			icon: 'trash',
			framed: false
		} );
		this.removeButton.connect( this, { click: 'onClick' } );
		this.inputContainer.$element.append(
			this.propertyInputWidget.$element,
			this.removeButton.$element
		);

		this.$element.append(
			this.addPropertyButton.$element,
			this.inputContainer.$element.hide()
		);
	};
OO.inheritClass( AddPropertyWidget, OO.ui.Widget );

AddPropertyWidget.prototype.onClick = function () {
	this.inputContainer.$element.toggle();
};

/**
 * @param {ItemInputWidget} item
 * @param {Object} data
 */
AddPropertyWidget.prototype.onChoose = function ( item, data ) {
	this.propertyInputWidget.setValue( '' );
	this.inputContainer.$element.hide();

	this.propertyIds.push( data.id );
	this.propertyInputWidget.setFilter( this.getFilters() );
};

/**
 * @return {Array}
 */
AddPropertyWidget.prototype.getFilters = function () {
	return [
		{ field: 'datatype', value: 'wikibase-item' },
		{ field: '!id', value: this.propertyIds.join( '|' ) }
	];
};

module.exports = AddPropertyWidget;
