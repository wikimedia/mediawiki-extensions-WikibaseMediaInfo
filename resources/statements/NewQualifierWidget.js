'use strict';

var QualifierWidget,
	QualifierAutocomplete = require( './QualifierAutocompleteWidget.js' ),
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
 * @param {boolean} [config.editing] Edit state of the widget when created;
 * defaults to false.
 */
QualifierWidget = function ( config ) {
	config = config || {};
	this.editing = !!config.editing;

	QualifierWidget.parent.call( this, config );
	FormatValueElement.call( this, $.extend( {}, config ) );

	// sub-widgets
	this.propertyInput = new QualifierAutocomplete( {
		classes: [ 'wbmi-qualifier-property' ]
	} );

	this.valueInput = new QualifierValueInput( {
		classes: [ 'wbmi-qualifier-value-input' ]
	} );

	this.removeIcon = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-qualifier-remove' ],
		framed: false,
		icon: 'close'
	} );

	this.valueInput.setDisabled( true );

	// event listeners
	this.propertyInput.connect( this, { choose: 'onPropertyChoose' } );
	this.valueInput.connect( this, { change: 'onValueChange' } );
	this.removeIcon.connect( this, { click: [ 'emit', 'delete' ] } );

	this.render();
};

OO.inheritClass( QualifierWidget, OO.ui.Widget );
OO.mixinClass( QualifierWidget, FormatValueElement );

/**
 * Render the widget's template and update the DOM
 */
QualifierWidget.prototype.render = function () {
	var self = this,
		template,
		$element;

	template = mw.template.get(
		'wikibase.mediainfo.statements',
		'templates/statements/QualifierWidget.mustache+dom'
	);

	this.asyncFormatForDisplay().then( function ( propertyHtml, valueHtml ) {
		var data = {
			editing: self.editing,
			propertyInput: self.propertyInput,
			valueInput: self.valueInput,
			removeIcon: self.removeIcon,
			property: {
				text: propertyHtml.indexOf( '<' ) >= 0 ? $( propertyHtml ).text() : propertyHtml,
				link: propertyHtml.indexOf( '<' ) >= 0 ? $( propertyHtml ).attr( 'href' ) : ''
			},
			value: {
				text: valueHtml.indexOf( '<' ) >= 0 ? $( valueHtml ).text() : valueHtml,
				link: valueHtml.indexOf( '<' ) >= 0 ? $( valueHtml ).attr( 'href' ) : ''
			},
			separator: mw.message( 'colon-separator' ).text()
		};

		self.$element.children().detach();
		$element = template.render( data );
		self.$element.empty().append( $element );
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
 */
QualifierWidget.prototype.setEditing = function ( editing ) {
	this.editing = editing;
	this.render();
};

/**
 * Sets the child widgets' data and updates label elements asynchronously.
 * @param {wikibase.datamodel.Snak} data
 */
QualifierWidget.prototype.setData = function ( data ) {
	var propId,
		dataValue,
		dataValueType;

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof wikibase.datamodel.Snak ) ) {
		return;
	}

	propId = data.getPropertyId();
	dataValue = data.getValue();
	dataValueType = dataValue.getType();

	this.data = data;

	this.updatePropertyInput( { id: propId, dataValueType: dataValueType } );
	this.valueInput.setData( dataValue );
	this.render();
};

/**
 * Extracts data from child widgets for use elsewhere.
 * @return {wikibase.datamodel.Snak} data
 */
QualifierWidget.prototype.getData = function () {
	var property = this.propertyInput.getData(),
		snak = new wikibase.datamodel.PropertyValueSnak(
			property.id,
			this.valueInput.getData()
		);

	// if snak hasn't changed since `this.setData`,
	// return the original data (which includes `hash`)
	return this.data && this.data.equals( snak ) ? this.data : snak;
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
	this.render();
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
	this.render();
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
	return this.formatValue( new wikibase.datamodel.EntityId( propId ), format, language );
};

/**
 * @param {Object} property
 * @param {string} property.id property ID
 * @param {string} property.dataValueType datavalue type
 * @param {string} [property.label] human-readable property label
 */
QualifierWidget.prototype.updatePropertyInput = function ( property ) {
	var self = this;

	this.propertyInput.setData( property );
	this.updateValueInput( property.dataValueType );

	if ( this.formatPropertyPromise ) {
		this.formatPropertyPromise.abort();
	}

	// if the label is not yet known, format it to feed to the input field
	if ( !( 'label' in property ) ) {
		this.formatPropertyPromise = this.formatProperty( property.id );
		this.formatPropertyPromise.then( function ( formatted ) {
			self.updatePropertyInput( $.extend( {}, property, {
				label: formatted
			} ) );
		} );
	}
};

/**
 * @param {string} datatype datavalue type
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

module.exports = QualifierWidget;
