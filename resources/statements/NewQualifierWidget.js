'use strict';

var QualifierWidget,
	QualifierAutocomplete = require( './QualifierAutocomplete.js' ),
	QualifierValueInput = require( './QualifierValueInputWidget.js' ),
	FormatValueElement = require( './FormatValueElement.js' );

/**
 * QualifierWidget (new version). This widget represents a single row of
 * qualifier-related widgets within a single ItemWidget inside a StatementPanel.
 * These widgets handle both the "read" and "edit" UI modes. Actual management
 * of UI state and the showing/hiding of widgets is handled at the level of the
 * ItemWidget.
 *
 * This widget listens for events from its children and updates its
 * data in response to user actions. Data can also be set programatically by
 * calling the setData() method.
 *
 * @constructor
 * @param {Object} config
 */
QualifierWidget = function ( config ) {
	config = config || {};

	QualifierWidget.parent.call( this, config );
	FormatValueElement.call( this, $.extend( {}, config ) );

	// sub-widgets
	this.propertyInput = new QualifierAutocomplete( {
		classes: [ 'wbmi-qualifier-property' ]
	} );

	this.valueInput = new QualifierValueInput( {
		classes: [ 'wbmi-qualifier-value-input' ]
	} );

	this.valueWidget = new OO.ui.Widget( {
		classes: [ 'wbmi-qualifier-value' ]
	} );

	this.removeIcon = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-qualifier-remove' ],
		framed: false,
		icon: 'close'
	} );

	this.layout = new OO.ui.HorizontalLayout( {
		items: [
			this.valueWidget,
			this.propertyInput,
			this.valueInput,
			this.removeIcon
		],
		classes: [ 'wbmi-qualifier' ]
	} );

	this.$element = this.layout.$element;
	this.valueInput.setDisabled( true );

	// event listeners
	this.propertyInput.connect( this, { choose: 'onPropertyChoose' } );
	this.valueInput.connect( this, { change: 'onValueChange' } );
	this.removeIcon.connect( this, { click: [ 'emit', 'delete' ] } );
};

OO.inheritClass( QualifierWidget, OO.ui.Widget );
OO.mixinClass( QualifierWidget, FormatValueElement );

/**
 * @chainable
 * @return {QualifierWidget} widget
 */
QualifierWidget.prototype.focus = function () {
	this.propertyInput.focus();
	return this;
};

/**
 * Sets the child widgets' data and updates label elements asynchronously.
 * @param {wikibase.datamodel.Snak} data
 */
QualifierWidget.prototype.setData = function ( data ) {
	var self = this,
		propId,
		dataValue,
		datatype;

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof wikibase.datamodel.Snak ) ) {
		return;
	}

	propId = data.getPropertyId();
	dataValue = data.getValue();
	datatype = dataValue.getType();

	this.data = data;

	this.updatePropertyInput( { id: propId, datatype: datatype } );
	this.valueInput.setData( dataValue );
	this.asyncUpdate( { id: propId, datatype: datatype }, dataValue ).then( function ( formattedProperty ) {
		self.updatePropertyInput( {
			id: propId,
			label: formattedProperty,
			datatype: datatype
		} );
	} );
};

/**
 * Extracts data from child widgets for use elsewhere.
 * @return {wikibase.datamodel.Snak|undefined} data
 */
QualifierWidget.prototype.getData = function () {
	var snak = this.constructNewSnak();

	if ( snak ) {
		return this.data && this.data.equals( snak ) ? this.data : snak;
	} else {
		return undefined;
	}
};

/**
 * Construct a snak from current data if possible
 * @return {wikibase.datamodel.Snak|undefined} Snak
 */
QualifierWidget.prototype.constructNewSnak = function () {
	var property = this.propertyInput.getData(),
		value;

	try {
		value = this.valueInput.getData();
	} catch ( e ) {
		return undefined;
	}

	return new wikibase.datamodel.PropertyValueSnak( property.id, value );
};

/**
 * Handles property selection by the user
 */
QualifierWidget.prototype.onPropertyChoose = function () {
	var property = this.propertyInput.getData(),
		snak = this.constructNewSnak();

	if ( snak ) {
		this.data = snak;
		this.updateValueInput( property.datatype );
		this.asyncUpdate( property, snak.getValue() );
		this.emit( 'change' );
	}
};

/**
 * Handles change of valueInput text from the user
 */
QualifierWidget.prototype.onValueChange = function () {
	var property = this.propertyInput.getData(),
		snak = this.constructNewSnak();

	if ( this.data && this.data.equals( snak ) ) {
		return;
	}

	if ( snak ) {
		this.data = snak;
		this.asyncUpdate( property, snak.getValue() );
		this.emit( 'change' );
	}
};

/**
 * Ergonomic wrapper around formatValue() to make it easier to deal with
 * properties.
 * @param {string} propId
 * @return {$.Promise} promise
 */
QualifierWidget.prototype.formatProperty = function ( propId ) {
	return this.formatValue( new wikibase.datamodel.EntityId( propId ) );
};

/**
 * @param {Object} property
 * @param {string} property.id property ID
 * @param {string} property.label human-readable property label
 * @param {string} property.datatype property datatype
 */
QualifierWidget.prototype.updatePropertyInput = function ( property ) {
	this.propertyInput.setData( property );
	this.updateValueInput( property.datatype );
};

/**
 * @param {string} datatype
 * @param {dataValues.DataValue} [value]
 */
QualifierWidget.prototype.updateValueInput = function ( datatype, value ) {
	this.valueInput.setInputType( datatype );

	if ( value ) {
		this.valueInput.setData( value );
	}

	this.valueInput.setDisabled( false );
};

/**
 * Update the text of the ValueWidget element.
 * @param {string} propertyLabel
 * @param {string} valueLabel
 */
QualifierWidget.prototype.updateValueWidget = function ( propertyLabel, valueLabel ) {
	this.valueWidget.$element.text(
		propertyLabel + mw.message( 'colon-separator' ) + valueLabel
	);
};

/**
 * Asynchronously update the label elements with data from the API.
 * @param {Object} property
 * @param {string} property.id
 * @param {string} property.datatype
 * @param {dataValues.DataValue} dataValue
 * @return {jQuery.Promise}
 */
QualifierWidget.prototype.asyncUpdate = function ( property, dataValue ) {
	var self = this,
		promises = [
			this.formatProperty( property.id ),
			this.formatValue( dataValue )
		];

	if ( this.updatePromise ) {
		this.updatePromise.abort();
	}

	this.updatePromise = $.when.apply( $, promises ).promise( { abort: function () {
		promises.forEach( function ( promise ) {
			promise.abort();
		} );
	} } );

	this.updatePromise.then( function ( formattedProperty, formattedValue ) {
		self.updateValueWidget( formattedProperty, formattedValue );
	} );

	return this.updatePromise;
};

module.exports = QualifierWidget;
