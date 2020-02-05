'use strict';

var QualifierWidget,
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	inputs = require( './inputs/index.js' ),
	serialization = require( 'wikibase.serialization' ),
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

	this.dataTypeMap = mw.config.get( 'wbDataTypes', {} );

	// sub-widgets
	this.propertyInput = new inputs.EntityInputWidget( {
		isQualifier: true,
		classes: [ 'wbmi-qualifier-property' ],
		entityType: 'property',
		filter: this.getFilters(),
		placeholder: mw.message( 'wikibasemediainfo-property-placeholder' ).text()
	} );

	this.valueInput = new inputs.MultiTypeInputWrapperWidget( {
		classes: [ 'wbmi-qualifier-value-input' ],
		isQualifier: true
	} );

	this.valueInput.setDisabled( true );

	// event listeners
	this.propertyInput.connect( this, { add: 'onChooseProperty' } );
	this.propertyInput.connect( this, { add: 'onChange' } );
	this.valueInput.connect( this, { change: 'onChange' } );

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
	var self = this;

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof datamodel.Snak ) ) {
		throw new Error( 'Invalid snak' );
	}

	return $.when(
		this.propertyInput.setData( new datamodel.EntityId( data.getPropertyId() ) ),
		this.valueInput.setData( data.getValue() ),
		// we want to keep a copy of the data to be able to check
		// whether there have been changes to the input, but we'll
		// serialize/deserialze in order to have a clone (in case
		// this reference gets modified elsewhere)
		this.setState( { data: this.cloneSnak( data ) } )
	).then( function () {
		self.valueInput.setDisabled( false );
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
			property.toJSON().id,
			this.valueInput.getData()
		);

	// if snak hasn't changed since `this.setData`,
	// return the original data (which includes `hash`)
	return this.state.data && this.state.data.equals( snak ) ? this.state.data : snak;
};

/**
 * @param {EntityInputWidget} input
 * @param {Object} data
 */
QualifierWidget.prototype.onChooseProperty = function ( input, data ) {
	this.valueInput.setInputType( this.dataTypeMap[ data.datatype ].dataValueType );
	this.valueInput.setDisabled( false );
};

QualifierWidget.prototype.onChange = function () {
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
 * Asynchronously update the label elements with data from the API.
 * @return {jQuery.Promise}
 */
QualifierWidget.prototype.asyncFormatForDisplay = function () {
	var promises,
		dataValue,
		propertyId;

	try {
		dataValue = this.valueInput.getData();
		propertyId = this.propertyInput.getData().toJSON().id;

		promises = [
			this.formatProperty( propertyId, 'text/html' ),
			this.formatValue( dataValue, 'text/html', null, propertyId )
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
QualifierWidget.prototype.cloneSnak = function ( data ) {
	var serializer = new serialization.SnakSerializer(),
		deserializer = new serialization.SnakDeserializer();

	return deserializer.deserialize( serializer.serialize( data ) );
};

/**
 * @return {Object[]} filters
 */
QualifierWidget.prototype.getFilters = function () {
	var supportedTypes = mw.config.get( 'wbmiSupportedDataTypes' ) || [],
		uniqueTypes = supportedTypes.filter( function ( item, index, self ) {
			return self.indexOf( item ) === index;
		} );

	return [
		{ field: 'datatype', value: uniqueTypes.join( '|' ) }
	];
};

module.exports = QualifierWidget;
