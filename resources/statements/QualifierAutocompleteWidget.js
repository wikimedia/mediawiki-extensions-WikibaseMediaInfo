'use strict';

var QualifierAutocompleteWidget,
	EntityLookupElement = require( './EntityLookupElement.js' );

/**
 * QualifierAutocompleteWidget. This widget acts as a text input element with
 * auto-suggestion functionality. The suggestions are filtered based on the
 * hard-coded values in QualifierAutocompleteWidget.prototype.getFilters().
 *
 * This widget stores data about the property which has been chosen,
 * if a selection has been made. This data can be retreived by the parent
 * QualifierWidget in response to events.
 *
 * @constructor
 * @param {Object} config
 */
QualifierAutocompleteWidget = function ( config ) {
	this.config = $.extend(
		config, {
			entityType: 'property',
			filter: this.getFilters(),
			placeholder: mw.message( 'wikibasemediainfo-property-placeholder' ).text()
		}
	);

	QualifierAutocompleteWidget.parent.call( this, this.config );
	EntityLookupElement.call( this, $.extend( {}, config, {
		allowSuggestionsWhenEmpty: false,
		highlightFirst: false
	} ) );

	this.dataTypeMap = mw.config.get( 'wbDataTypes', {} );
	this.type = this.config.entityType;
	this.maxSuggestions = this.config.maxSuggestions;
	this.setFilter( this.config.filter || [] );
	this.connect( this, { choose: 'onChoose' } );
};

OO.inheritClass( QualifierAutocompleteWidget, OO.ui.TextInputWidget );
OO.mixinClass( QualifierAutocompleteWidget, EntityLookupElement );

/**
 * Handle the "choose" event from the widget's autocomplete menu.
 * @param {OO.ui.MenuOptionWidget} chosen
 */
QualifierAutocompleteWidget.prototype.onChoose = function ( chosen ) {
	this.setData( {
		id: chosen.data.id,
		label: chosen.data.label,
		dataValueType: this.dataTypeMap[ chosen.data.datatype ].dataValueType
	} );
};

/**
 * @param {Object} data
 * @param {string} data.id property ID
 * @param {string} data.dataValueType property datatype
 * @param {string} [data.label] human-readable property label
 */
QualifierAutocompleteWidget.prototype.setData = function ( data ) {
	this.data = data || {};
	this.setValue( this.data.label || '' );
};

/**
 * @return {Object} data
 */
QualifierAutocompleteWidget.prototype.getData = function () {
	return this.data || {};
};

/**
 * TODO: this method always returns an array with a single filter object
 * consisting of the hard-coded supportedTypes. This could probably be improved.
 * @return {Object[]} filters
 */
QualifierAutocompleteWidget.prototype.getFilters = function () {
	var supportedTypes = [
		'wikibase-item',
		'quantity',
		'string',
		'globe-coordinate'
	];

	return [
		{ field: 'datatype', value: supportedTypes.join( '|' ) }
	];
};

module.exports = QualifierAutocompleteWidget;
