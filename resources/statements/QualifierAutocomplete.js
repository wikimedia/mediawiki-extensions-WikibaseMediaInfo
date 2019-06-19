'use strict';

var QualifierAutocomplete,
	EntityLookupElement = require( './EntityLookupElement.js' );

/**
 * QualifierAutocomplete. This widget acts as a text input element with
 * auto-suggestion functionality. The suggestions are filtered based on the
 * hard-coded values in QualifierAutocomplete.prototype.getFilters().
 *
 * This widget stores data about the property which has been chosen,
 * if a selection has been made. This data can be retreived by the parent
 * QualifierWidget in response to events.
 *
 * @constructor
 * @param {Object} config
 */
QualifierAutocomplete = function ( config ) {
	this.config = $.extend(
		config, {
			entityType: 'property',
			filter: this.getFilters(),
			placeholder: mw.message( 'wikibasemediainfo-property-placeholder' ).text()
		}
	);

	QualifierAutocomplete.parent.call( this, this.config );
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

OO.inheritClass( QualifierAutocomplete, OO.ui.TextInputWidget );
OO.mixinClass( QualifierAutocomplete, EntityLookupElement );

/**
 * Handle the "choose" event from the widget's autocomplete menu.
 * @param {OO.ui.MenuOptionWidget} chosen
 */
QualifierAutocomplete.prototype.onChoose = function ( chosen ) {
	this.setData( {
		id: chosen.data.id,
		label: chosen.data.label,
		dataValueType: this.dataTypeMap[ chosen.data.datatype ].dataValueType
	} );
};

/**
 * @param {Object} data
 * @param {string} data.id property ID
 * @param {string} data.label human-readable property label
 * @param {string} data.datatype property datatype
 */
QualifierAutocomplete.prototype.setData = function ( data ) {
	this.data = data || {};

	if ( this.data.label ) {
		this.setValue( this.data.label );
	}
};

/**
 * @return {Object} data
 */
QualifierAutocomplete.prototype.getData = function () {
	return this.data || {};
};

/**
 * TODO: this method always returns an array with a single filter object
 * consisting of the hard-coded supportedTypes. This could probably be improved.
 * @return {Object[]} filters
 */
QualifierAutocomplete.prototype.getFilters = function () {
	var supportedTypes = [
		'wikibase-item',
		'quantity',
		'string'
	];

	return [
		{ field: 'datatype', value: supportedTypes.join( '|' ) }
	];
};

module.exports = QualifierAutocomplete;
