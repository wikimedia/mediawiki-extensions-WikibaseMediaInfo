'use strict';

var inputs = require( './inputs/index.js' ),
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
			this.input = new inputs.EntityInputWidget( {
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
};

StatementInputWidget.prototype.clearInput = function () {
	// instead of attempting to empty the input, just create a brand new one
	this.setInputType( this.config.valueType );
};

module.exports = StatementInputWidget;
