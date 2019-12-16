'use strict';

var inputs = require( './inputs/index.js' ),
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
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

	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/StatementInputWidget.mustache+dom'
	);
};

OO.inheritClass( StatementInputWidget, OO.ui.Widget );
OO.mixinClass( StatementInputWidget, ComponentWidget );

/**
 * @inheritdoc
 */
StatementInputWidget.prototype.getTemplateData = function () {
	var errorMessage = this.state.error ?
		new OO.ui.MessageWidget( {
			type: 'error',
			label: this.state.error
		} ) : undefined;

	return {
		input: this.input,
		error: errorMessage
	};
};

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
			self.setState( { error: null } );
			self.emit( 'add', dataValue );
		},
		function ( error ) {
			self.setError( error );
		}
	);
};

/**
 * @inheritdoc
 */
StatementInputWidget.prototype.setError = function ( errorText ) {
	var self = this;

	return ComponentWidget.prototype.setError.call( this, errorText )
		.then( function () {
			if ( errorText ) {
				self.input.flagAsInvalid();
			}
		} );
};

StatementInputWidget.prototype.clearInput = function () {
	// instead of attempting to empty the input, just create a brand new one
	this.setInputType( this.config.valueType );
};

module.exports = StatementInputWidget;
