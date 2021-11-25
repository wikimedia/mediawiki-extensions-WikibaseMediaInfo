'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	EntityAutocompleteInputWidget = require( './EntityAutocompleteInputWidget.js' ),
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	EntityInputWidget;

/**
 * @param {Object} [config] Configuration options
 * @param {boolean} [config.isQualifier] True when used as qualifier value, false (default) for statement level
 * @param {string} [config.entityType] 'property' or 'item' (defaults to 'item')
 * @param {number} [config.maxSuggestions] The maximum number of suggestions to display in the auto-suggest
 * @param {Array} [config.filter] Array of objects each containing fields 'field' and 'value'.
 *      Suggestions will only displayed if suggestion.{field} === {value} ... e.g. if config.filter
 *      contains { 'field': 'type', 'value: 'property' } then only suggestions with 'type'
 *      equal to 'property' will be returned.
 *      Suffixing the value of 'field' with the character ! inverts the filter
 */
EntityInputWidget = function MediaInfoStatementsEntityInputWidget( config ) {
	config = config || {};

	this.input = new EntityAutocompleteInputWidget( $.extend( {}, {
		placeholder: !config.isQualifier ?
			mw.msg( 'wikibasemediainfo-statements-item-input-placeholder' ) :
			undefined,
		icon: !config.isQualifier ? 'search' : undefined,
		label: !config.isQualifier ?
			mw.msg( 'wikibasemediainfo-statements-item-input-label' ) :
			undefined
	}, config ) );
	this.input.connect( this, { add: [ 'emit', 'change' ] } );
	this.input.connect( this, { add: [ 'emit', 'add', this ] } );

	EntityInputWidget.parent.call( this );
	AbstractInputWidget.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/EntityInputWidget.mustache+dom'
	);
};
OO.inheritClass( EntityInputWidget, OO.ui.Widget );
OO.mixinClass( EntityInputWidget, AbstractInputWidget );
OO.mixinClass( EntityInputWidget, ComponentWidget );

/**
 * @inheritDoc
 */
EntityInputWidget.prototype.getTemplateData = function () {
	return {
		isQualifier: this.state.isQualifier,
		input: this.input
	};
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.getRawValue = function () {
	return this.input.getData();
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.getData = function () {
	return dataValues.newDataValue( 'wikibase-entityid', {
		id: this.getRawValue()
	} );
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.setData = function ( data ) {
	var self = this;

	if ( data && data.toJSON().id !== this.input.getData() ) {
		return this.input.setData( data.toJSON().id ).then( function () {
			self.emit( 'change' );
			return self.$element;
		} );
	}

	return $.Deferred().resolve( this.$element ).promise();
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.clear = function () {
	var self = this;
	return this.input.setData( undefined ).then( function () {
		return self.$element;
	} );
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.focus = function () {
	this.input.focus();
};

/**
 * @inheritdoc
 */
EntityInputWidget.prototype.setDisabled = function ( disabled ) {
	this.input.setDisabled( disabled );
	ComponentWidget.prototype.setDisabled.call( this, disabled );
};

module.exports = EntityInputWidget;
