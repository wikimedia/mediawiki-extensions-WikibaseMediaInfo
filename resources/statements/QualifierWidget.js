'use strict';

var QualifierWidget,
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	QualifierAutocomplete = require( './QualifierAutocompleteWidget.js' ),
	QualifierValueInput = require( './QualifierValueInputWidget.js' ),
	FormatValueElement = require( './FormatValueElement.js' ),
	datamodel = require( 'wikibase.datamodel' );

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
 * @param {Object} [config.data] Initial data
 * @param {boolean} [config.editing] Edit state of the widget when created;
 * defaults to false.
 */
QualifierWidget = function ( config ) {
	config = config || {};
	this.state = {
		data: config.data,
		editing: !!config.editing
	};

	// sub-widgets
	this.propertyInput = new QualifierAutocomplete( {
		classes: [ 'wbmi-qualifier-property' ]
	} );

	this.valueInput = new QualifierValueInput( {
		classes: [ 'wbmi-qualifier-value-input' ]
	} );

	this.valueInput.setDisabled( true );

	// event listeners
	this.propertyInput.connect( this, { choose: 'onPropertyChoose' } );
	this.valueInput.connect( this, { change: 'onValueChange' } );

	QualifierWidget.parent.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/QualifierWidget.mustache+dom'
	);
	FormatValueElement.call( this, $.extend( {}, config ) );
};
OO.inheritClass( QualifierWidget, OO.ui.Widget );
OO.mixinClass( QualifierWidget, ComponentWidget );
OO.mixinClass( QualifierWidget, FormatValueElement );

/**
 * @inheritDoc
 */
QualifierWidget.prototype.getTemplateData = function () {
	var self = this;

	return this.asyncFormatForDisplay().then( function ( propertyHtml, valueHtml ) {
		var formatResponse, removeIcon;

		formatResponse = function ( html ) {
			return $( '<div>' )
				.append( html )
				.find( 'a' )
				.attr( 'target', '_blank' )
				.end()
				.html();
		};

		removeIcon = new OO.ui.ButtonWidget( {
			classes: [ 'wbmi-qualifier-remove' ],
			framed: false,
			icon: 'close'
		} );
		removeIcon.connect( self, { click: [ 'emit', 'delete' ] } );

		return {
			editing: self.state.editing,
			propertyInput: self.propertyInput,
			valueInput: self.valueInput,
			removeIcon: removeIcon,
			property: formatResponse( propertyHtml ),
			value: formatResponse( valueHtml ),
			separator: mw.message( 'colon-separator' ).text()
		};
	} );
};

/**
 * @chainable
 * @return {QualifierWidget} widget
 */
QualifierWidget.prototype.focus = function () {
	this.propertyInput.focus();
	return this;
};

/**
 * Set the read/edit state to the desired value and re-render the widget from
 * its template.
 * @param {boolean} editing
 * @return {jQuery.Promise} Resolves after rerender
 */
QualifierWidget.prototype.setEditing = function ( editing ) {
	return this.setState( { editing: editing } );
};

/**
 * Sets the child widgets' data and updates label elements asynchronously.
 * @param {datamodel.Snak} data
 * @return {jQuery.Promise}
 */
QualifierWidget.prototype.setData = function ( data ) {
	var self = this,
		propId,
		dataValue,
		dataValueType;

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof datamodel.Snak ) ) {
		throw new Error( 'Invalid snak' );
	}

	propId = data.getPropertyId();
	dataValue = data.getValue();
	dataValueType = dataValue.getType();

	return $.when(
		this.updatePropertyInput( { id: propId, dataValueType: dataValueType } ),
		this.updateValueInput( dataValue.getType(), dataValue ),
		this.setState( { data: this.cloneData( data ) } )
	).then( function () {
		return self.$element;
	} );
};

/**
 * Extracts data from child widgets for use elsewhere.
 * @return {datamodel.Snak} data
 */
QualifierWidget.prototype.getData = function () {
	var property = this.propertyInput.getData(),
		snak = new datamodel.PropertyValueSnak(
			property.id,
			this.valueInput.getData()
		);

	// if snak hasn't changed since `this.setData`,
	// return the original data (which includes `hash`)
	return this.state.data && this.state.data.equals( snak ) ? this.state.data : snak;
};

/**
 * Handles property selection by the user
 */
QualifierWidget.prototype.onPropertyChoose = function () {
	var property = this.propertyInput.getData();
	this.updateValueInput( property.dataValueType );

	// abort in-flight API requests - there's no point in continuing
	// to fetch the text-to-render when we've already changed it...
	if ( this.formatDisplayPromise ) {
		this.formatDisplayPromise.abort();
	}

	this.emit( 'change' );
};

/**
 * Handles change of valueInput text from the user
 */
QualifierWidget.prototype.onValueChange = function () {
	// abort in-flight API requests - there's no point in continuing
	// to fetch the text-to-render when we've already changed it...
	if ( this.formatDisplayPromise ) {
		this.formatDisplayPromise.abort();
	}

	this.emit( 'change' );
};

/**
 * Ergonomic wrapper around formatValue() to make it easier to deal with
 * properties.
 * @param {string} propId
 * @param {string} [format] e.g. text/plain or text/html
 * @param {string} [language]
 * @return {$.Promise} promise
 */
QualifierWidget.prototype.formatProperty = function ( propId, format, language ) {
	return this.formatValue( new datamodel.EntityId( propId ), format, language );
};

/**
 * @param {Object} property
 * @param {string} property.id property ID
 * @param {string} property.dataValueType datavalue type
 * @param {string} [property.label] human-readable property label
 * @return {jQuery.Promise}
 * @internal
 */
QualifierWidget.prototype.updatePropertyInput = function ( property ) {
	var self = this;

	if ( this.formatPropertyPromise ) {
		this.formatPropertyPromise.abort();
	}

	if ( 'label' in property ) {
		this.propertyInput.setData( property );
	} else {
		// if the label is not yet known, format it to feed to the input field
		this.formatPropertyPromise = this.formatProperty( property.id );
		return this.formatPropertyPromise.then( function ( formatted ) {
			return self.updatePropertyInput( $.extend( {}, property, {
				label: formatted
			} ) );
		} );
	}

	return $.Deferred().resolve( this.$element ).promise();
};

/**
 * @param {string} datatype datavalue type
 * @param {dataValues.DataValue} [value]
 * @return {jQuery.Promise}
 * @internal
 */
QualifierWidget.prototype.updateValueInput = function ( datatype, value ) {
	var self = this,
		promise;

	this.valueInput.setDisabled( false );

	if ( value !== undefined ) {
		promise = this.valueInput.setData( value );
	} else {
		promise = this.valueInput.setInputType( datatype );
	}

	return promise.then( function () {
		return self.$element;
	} );
};

/**
 * Asynchronously update the label elements with data from the API.
 * @return {jQuery.Promise}
 */
QualifierWidget.prototype.asyncFormatForDisplay = function () {
	var promises,
		dataValue;

	try {
		dataValue = this.valueInput.getData();

		promises = [
			this.formatProperty( this.propertyInput.getData().id, 'text/html' ),
			this.formatValue( dataValue, 'text/html' )
		];

		this.formatDisplayPromise = $.when.apply( $, promises ).promise( {
			abort: function () {
				promises.forEach( function ( promise ) {
					promise.abort();
				} );
			}
		} );

		return this.formatDisplayPromise;
	} catch ( e ) {
		// nothing to render if data is invalid...
		return $.Deferred().resolve( '', '' ).promise();
	}
};

/**
 * @internal
 * @param {datamodel.Snak} data
 * @return {datamodel.Snak}
 */
QualifierWidget.prototype.cloneData = function ( data ) {
	var serializer = new wikibase.serialization.SnakSerializer(),
		deserializer = new wikibase.serialization.SnakDeserializer();

	return deserializer.deserialize( serializer.serialize( data ) );
};

module.exports = QualifierWidget;
