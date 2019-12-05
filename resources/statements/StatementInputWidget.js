'use strict';

var ItemInputWidget = require( './ItemInputWidget.js' ),
	inputs = require( './inputs/index.js' ),
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
			this.input = new inputs.QuantityInputWidget( {
				classes: this.config.classes,
				isQualifier: false
			} );
			break;
		case 'string':
			this.input = new inputs.StringInputWidget( {
				classes: this.config.classes,
				isQualifier: false
			} );
			break;
		case 'globecoordinate':
			this.input = new inputs.GlobeCoordinateInputWidget( {
				classes: this.config.classes,
				isQualifier: false
			} );
			break;
		default:
			this.input = new inputs.UnsupportedInputWidget( {
				classes: this.config.classes,
				isQualifier: false
			} );
	}

	this.input.connect( this, { add: 'onAdd' } );
	this.$element = this.input.$element;
};

/**
 * Handle the value from the appropriate input widget and send to Wikibase for
 * parsing; the datatype used for parsing is based on this instance's
 * propertyType
 *
 * @param {AbstractInputWidget} input
 */
StatementInputWidget.prototype.onAdd = function ( input ) {
	var self = this;

	// @TODO this is temporary while input types are being refactored to extend
	// from AbstractInputWidget
	if ( typeof input.parseValue === 'function' ) {
		input.parseValue( this.config.propertyType ).then(
			function ( dataValue ) {
				self.clearInput();
				self.emit( 'add', dataValue );
			},
			function ( error ) {
				// TODO: replace alert() with real error message UI
				/* eslint-disable-next-line no-alert */
				alert( error );
				self.clearInput();
			}
		);
	} else {
		new mw.Api().get( {
			action: 'wbparsevalue',
			format: 'json',
			datatype: this.config.propertyType,
			values: [ input ],
			validate: true
		} ).then( function ( response ) {
			// TODO: is there a better way to do this?
			var rawValue = response.results[ 0 ],
				dv = dataValues.newDataValue( rawValue.type, rawValue.value );
			self.clearInput();
			self.emit( 'add', dv );
		} ).catch( function ( error, response ) {
			// TODO: replace alert() with real error message UI
			/* eslint-disable-next-line no-alert */
			alert( response.error.info );
			self.clearInput();
		} );
		return;
	}
};

StatementInputWidget.prototype.clearInput = function () {
	// instead of attempting to empty the input, just create a brand new one
	this.setInputType( this.config.valueType );
};

module.exports = StatementInputWidget;
