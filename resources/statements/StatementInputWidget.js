'use strict';

var ItemInputWidget = require( './ItemInputWidget.js' ),
	QuantityInputWidget = require( './QuantityInputWidget.js' ),
	StringInputWidget = require( './StringInputWidget.js' ),
	StatementInputWidget;

/**
 * @constructor
 * @param {Object} config
 * @param {string} config.propertyType property datatype (url, wikibase-item, etc)
 * @param {string} config.valueType value datatype (string, wikibase-entityid, etc)
 */
StatementInputWidget = function ( config ) {
	this.config = $.extend( {}, config );
	StatementInputWidget.parent.call( this, this.config );
	this.setInputType( config.valueType );
};

OO.inheritClass( StatementInputWidget, OO.ui.Widget );

/**
 * @param {string} type value datatype
 */

StatementInputWidget.prototype.setInputType = function ( type ) {
	switch ( type ) {
		case 'wikibase-entityid':
			this.input = new ItemInputWidget( {
				classes: this.config.classes
			} );
			break;
		case 'quantity':
			this.input = new QuantityInputWidget( {
				classes: this.config.classes,
				isQualifier: false
			} );
			break;
		case 'string':
			this.input = new StringInputWidget( {
				classes: this.config.classes,
				isQualifier: false
			} );
			break;
		default:
			this.input = new StringInputWidget( {
				classes: this.config.classes
			} );
	}

	this.input.connect( this, { addItem: 'onAddItem' } );
	this.$element = this.input.$element;
};

/**
 * Handle the value from the appropriate input widget and send to Wikibase for
 * parsing; the datatype used for parsing is based on this instance's
 * propertyType
 * @param {string|number} item wikibase ID (Q1), string, or number value
 */

StatementInputWidget.prototype.onAddItem = function ( item ) {
	var self = this;
	new mw.Api().get( {
		action: 'wbparsevalue',
		format: 'json',
		datatype: this.config.propertyType,
		values: [ item ],
		validate: true
	} ).then( function ( response ) {
		// TODO: is there a better way to do this?
		var rawValue = response.results[ 0 ],
			dv = dataValues.newDataValue( rawValue.type, rawValue.value );
		self.clearInput();
		self.emit( 'addItem', dv );
	} ).catch( function ( error, response ) {
		// TODO: replace alert() with real error message UI
		/* eslint-disable-next-line no-alert */
		alert( response.error.info );
		self.clearInput();
	} );
};

StatementInputWidget.prototype.clearInput = function () {
	// instead of attempting to empty the input, just create a brand new one
	this.setInputType( this.config.valueType );
};

module.exports = StatementInputWidget;
