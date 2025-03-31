'use strict';

const ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	inputs = require( './inputs/index.js' );

/**
 * @constructor
 * @param {Object} [config]
 * @param {Array} [config.propertyIds] An array of property ids of statements that exist on the page
 */
const AddPropertyWidget = function MediaInfoAddPropertyWidget( config ) {
	config = config || {};
	this.state = {
		propertyIds: config.propertyIds || [],
		editing: false
	};

	AddPropertyWidget.super.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/AddPropertyWidget.mustache+dom'
	);
};
OO.inheritClass( AddPropertyWidget, OO.ui.Widget );
OO.mixinClass( AddPropertyWidget, ComponentWidget );

/**
 * @inheritDoc
 */
AddPropertyWidget.prototype.getTemplateData = function () {
	const propertyInputWidget = new inputs.EntityInputWidget( {
		entityType: 'property',
		filter: this.getFilters(),
		maxSuggestions: 7,
		placeholder: mw.msg( 'wikibasemediainfo-add-property' )
	} );

	propertyInputWidget.connect( this, { add: 'onChoose' } );
	propertyInputWidget.connect( this, { add: [ 'setEditing', false ] } );
	propertyInputWidget.connect( this, { add: [ 'emit', 'choose' ] } );

	const addPropertyButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-entityview-add-statement-property-button' ],
		framed: true,
		icon: 'add',
		flags: [ 'progressive' ],
		label: mw.msg( 'wikibasemediainfo-add-statement' )
	} );

	addPropertyButton.connect( this, { click: [ 'setEditing', !this.state.editing ] } );

	const removeButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-item-remove' ],
		title: mw.msg( 'wikibasemediainfo-statements-item-remove' ),
		flags: 'destructive',
		icon: 'trash',
		framed: false
	} );

	removeButton.connect( this, { click: [ 'setEditing', false ] } );

	return {
		editing: this.state.editing,
		addPropertyButton: addPropertyButton,
		propertyInputWidget: propertyInputWidget,
		removeButton: removeButton
	};
};

/**
 * @return {Array}
 */
AddPropertyWidget.prototype.getFilters = function () {
	const supportedTypes = mw.config.get( 'wbmiSupportedDataTypes' ) || [],
		uniqueTypes = supportedTypes.filter( ( item, index, self ) => self.indexOf( item ) === index );

	return [
		{ field: 'datatype', value: uniqueTypes.join( '|' ) },
		{ field: '!id', value: this.state.propertyIds.join( '|' ) }
	];
};

/**
 * @param {string} propertyId
 * @return {jQuery.Promise}
 */
AddPropertyWidget.prototype.addPropertyId = function ( propertyId ) {
	if ( this.state.propertyIds.includes( propertyId ) ) {
		return $.Deferred().resolve( this.$element ).promise();
	}

	return this.setState( { propertyIds: this.state.propertyIds.concat( propertyId ) } );
};

/**
 * @param {boolean} editing
 * @return {jQuery.Promise} Resolves after rerender
 */
AddPropertyWidget.prototype.setEditing = function ( editing ) {
	return this.setState( { editing: editing } );
};

/**
 * @param {EntityInputWidget} input
 */
AddPropertyWidget.prototype.onChoose = function ( input ) {
	this.addPropertyId( input.getRawValue() );
};

/**
 * If a statement panel has been removed then the filters in the property input widget need to
 * be updated (properties with existing panels are filtered out of the input widget, and the
 * property id of the removed panel shouldn't be filtered out anymore)
 *
 * @param {number} panelPropertyId
 */
AddPropertyWidget.prototype.onStatementPanelRemoved = function ( panelPropertyId ) {
	this.setState( {
		propertyIds: this.state.propertyIds.filter( ( propertyId ) => propertyId !== panelPropertyId )
	} );
};

module.exports = AddPropertyWidget;
