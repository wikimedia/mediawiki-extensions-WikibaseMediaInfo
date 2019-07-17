'use strict';

var ItemInputWidget = require( './ItemInputWidget.js' ),
	/**
	 * @constructor
	 * @param {Object} [config]
	 * @cfg {array} [propertyIds] An array of property ids of statements that exist on the page
	 */
	AddPropertyWidget = function MediaInfoAddPropertyWidget( config ) {
		config = config || {};
		AddPropertyWidget.parent.call(
			this,
			config
		);

		this.propertyIds = config.propertyIds || [];
		this.editing = false;

		this.render();
	};
OO.inheritClass( AddPropertyWidget, OO.ui.Widget );

AddPropertyWidget.prototype.render = function () {
	var data,
		template,
		$element,
		propertyInputWidget,
		addPropertyButton,
		removeButton;

	propertyInputWidget = new ItemInputWidget( {
		classes: [ 'wbmi-entityview-add-statement-property' ],
		entityType: 'property',
		filter: this.getFilters(),
		maxSuggestions: 7,
		placeholder: mw.message( 'wikibasemediainfo-add-property' ).text()
	} );
	propertyInputWidget.connect( this, { choose: 'onChoose' } );
	propertyInputWidget.connect( this, { choose: [ 'setEditing', false ] } );
	propertyInputWidget.connect( this, { choose: [ 'emit', 'choose' ] } );

	addPropertyButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-entityview-add-statement-property-button' ],
		framed: true,
		icon: 'add',
		flags: [ 'progressive' ],
		label: mw.message( 'wikibasemediainfo-add-statement' ).text()
	} );
	addPropertyButton.connect( this, { click: [ 'setEditing', !this.editing ] } );

	removeButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-item-remove' ],
		title: mw.message( 'wikibasemediainfo-statements-item-remove' ).text(),
		flags: 'destructive',
		icon: 'trash',
		framed: false
	} );
	removeButton.connect( this, { click: [ 'setEditing', false ] } );

	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/AddPropertyWidget.mustache+dom'
	);

	data = {
		editing: this.editing,
		addPropertyButton: addPropertyButton,
		propertyInputWidget: propertyInputWidget,
		removeButton: removeButton
	};

	$element = template.render( data );
	this.$element.empty().append( $element );
};

AddPropertyWidget.prototype.setEditing = function ( editing ) {
	if ( this.editing !== editing ) {
		this.editing = editing;
		this.render();
	}
};

AddPropertyWidget.prototype.addPropertyId = function ( propertyId ) {
	if ( this.propertyIds.indexOf( propertyId ) === -1 ) {
		this.propertyIds.push( propertyId );
	}
};

/**
 * @param {ItemInputWidget} item
 * @param {Object} data
 */
AddPropertyWidget.prototype.onChoose = function ( item, data ) {
	this.propertyIds.push( data.id );
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

/**
 * If a statement panel has been removed then the filters in the property input widget need to
 * be updated (properties with existing panels are filtered out of the input widget, and the
 * property id of the removed panel shouldn't be filtered out anymore)
 *
 * @param {int} panelPropertyId
 */
AddPropertyWidget.prototype.onStatementPanelRemoved = function ( panelPropertyId ) {
	this.propertyIds = this.propertyIds.filter( function ( propertyId ) {
		return propertyId !== panelPropertyId;
	} );
};

module.exports = AddPropertyWidget;
