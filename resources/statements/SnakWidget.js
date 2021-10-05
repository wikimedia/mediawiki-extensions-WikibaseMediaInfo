'use strict';

var SnakWidget,
	ConstraintsReportHandlerElement = require( './ConstraintsReportHandlerElement.js' ),
	ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	FormatValueElement = require( 'wikibase.mediainfo.base' ).FormatValueElement,
	inputs = require( './inputs/index.js' ),
	serialization = require( 'wikibase.serialization' ),
	datamodel = require( 'wikibase.datamodel' ),
	valueTypes = {
		VALUE: datamodel.PropertyValueSnak.TYPE,
		SOMEVALUE: datamodel.PropertySomeValueSnak.TYPE,
		NOVALUE: datamodel.PropertyNoValueSnak.TYPE
	};

/**
 * This widget represents a single snak (property-value pair).
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
SnakWidget = function ( config ) {
	config = config || {};
	this.state = {
		data: config.data,
		editing: !!config.editing,
		constraintsReport: null
	};

	this.dataTypeMap = mw.config.get( 'wbDataTypes', {} );
	this.propertyTypes = mw.config.get( 'wbmiPropertyTypes' );

	// sub-widgets
	this.propertyInput = new inputs.EntityInputWidget( {
		isQualifier: true,
		classes: [ 'wbmi-snak-property' ],
		entityType: 'property',
		filter: this.getFilters(),
		placeholder: mw.msg( 'wikibasemediainfo-property-placeholder' )
	} );

	this.valueInput = new inputs.MultiTypeInputWrapperWidget( {
		classes: [ 'wbmi-snak-value-input' ],
		isQualifier: true
	} );

	this.valueInput.setDisabled( true );

	// event listeners
	this.propertyInput.connect( this, { add: 'onChooseProperty' } );
	this.propertyInput.connect( this, { add: 'onChange' } );
	this.valueInput.connect( this, { change: 'onChange' } );

	SnakWidget.parent.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/SnakWidget.mustache+dom'
	);
	FormatValueElement.call( this, $.extend( {}, config ) );
	ConstraintsReportHandlerElement.call( this, $.extend( {}, config ) );
};
OO.inheritClass( SnakWidget, OO.ui.Widget );
OO.mixinClass( SnakWidget, ComponentWidget );
OO.mixinClass( SnakWidget, FormatValueElement );
OO.mixinClass( SnakWidget, ConstraintsReportHandlerElement );

/**
 * @inheritDoc
 */
SnakWidget.prototype.getTemplateData = function () {
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
			classes: [ 'wbmi-snak-remove' ],
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
			separator: mw.msg( 'colon-separator' ),
			constraintsReport: self.state.constraintsReport &&
				self.popupFromResults( self.state.constraintsReport )
		};
	} );
};

/**
 * @param {Object|null} results
 * @return {jQuery.Promise}
 */
SnakWidget.prototype.setConstraintsReport = function ( results ) {
	return this.setState( { constraintsReport: results && results.results } );
};

/**
 * @chainable
 * @return {SnakWidget} widget
 */
SnakWidget.prototype.focus = function () {
	this.propertyInput.focus();
	return this;
};

/**
 * Set the read/edit state to the desired value and re-render the widget from
 * its template.
 *
 * @param {boolean} editing
 * @return {jQuery.Promise} Resolves after rerender
 */
SnakWidget.prototype.setEditing = function ( editing ) {
	return this.setState( { editing: editing } );
};

/**
 * Sets the child widgets' data and updates label elements asynchronously.
 *
 * @param {datamodel.Snak} data
 * @return {jQuery.Promise}
 */
SnakWidget.prototype.setData = function ( data ) {
	var self = this,
		snakType = data.getType(),
		propertyId = data.getPropertyId(),
		dataValue,
		dataType;

	// Bail early and discard existing data if data argument is not a snak
	if ( !( data instanceof datamodel.Snak ) ) {
		throw new Error( 'Invalid snak' );
	}

	dataValue = snakType === valueTypes.VALUE ? data.getValue() : null;
	dataType = dataValue ? dataValue.getType() : undefined;
	if ( !dataType && this.propertyTypes[ propertyId ] in this.dataTypeMap ) {
		dataType = this.dataTypeMap[ this.propertyTypes[ propertyId ] ].dataValueType || undefined;
	}

	return $.when(
		this.propertyInput.setData( new datamodel.EntityId( propertyId ) ),
		// 3 things need to happen to the input wrapper, in order:
		//   1. Set the data type, which will inform which type of input is
		//      created
		//   2. Run the input wrapper's setData method, which creates the input
		//      and sends it a value if it exists
		//   3. Set the snak type so we can alter the input UI to show somevalue
		//      or novalue if applicable
		this.valueInput.setDataType( dataType )
			.then( this.valueInput.setData.bind( this.valueInput, dataValue ) )
			.then( this.valueInput.setSnakType.bind( this.valueInput, snakType ) )
	).then( function () {
		if ( snakType === valueTypes.VALUE ) {
			self.valueInput.setDisabled( false );
		}
		// we want to keep a copy of the data to be able to check
		// whether there have been changes to the input, but we'll
		// serialize/deserialze in order to have a clone (in case
		// this reference gets modified elsewhere)
		return self.setState( { data: self.cloneSnak( data ) } );
	} );
};

/**
 * Extracts data from child widgets for use elsewhere.
 *
 * @return {datamodel.Snak} data
 */
SnakWidget.prototype.getData = function () {
	var property = this.propertyInput.getData(),
		propertyId = property.toJSON().id,
		dataValue = this.valueInput.getData(),
		snakType = this.valueInput.getSnakType(),
		snak;

	switch ( snakType ) {
		case valueTypes.SOMEVALUE:
			snak = new datamodel.PropertySomeValueSnak( propertyId );
			break;
		case valueTypes.NOVALUE:
			snak = new datamodel.PropertyNoValueSnak( propertyId );
			break;
		default:
			snak = dataValue ?
				new datamodel.PropertyValueSnak( propertyId, dataValue, null ) :
				new datamodel.PropertyNoValueSnak( propertyId );
	}

	// if snak hasn't changed since `this.setData`,
	// return the original data (which includes `hash`)
	return this.state.data && this.state.data.equals( snak ) ? this.state.data : snak;
};

/**
 * @param {EntityInputWidget} input
 * @param {Object} data
 */
SnakWidget.prototype.onChooseProperty = function ( input, data ) {
	this.propertyTypes[ data.id ] = data.datatype;
	this.valueInput.setInputType( this.dataTypeMap[ data.datatype ].dataValueType );
	this.valueInput.setDisabled( false );
};

SnakWidget.prototype.onChange = function () {
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
 *
 * @param {string} propId
 * @param {string} [format] e.g. text/plain or text/html
 * @param {string} [language]
 * @return {jQuery.Promise} promise
 */
SnakWidget.prototype.formatProperty = function ( propId, format, language ) {
	return this.formatValue( new datamodel.EntityId( propId ), format, language );
};

/**
 * Asynchronously update the label elements with data from the API.
 *
 * @return {jQuery.Promise}
 */
SnakWidget.prototype.asyncFormatForDisplay = function () {
	var promises,
		dataValue,
		propertyId,
		valuePromise,
		message = this.valueInput.getSnakType() === valueTypes.SOMEVALUE ?
			mw.message( 'wikibasemediainfo-filepage-statement-some-value' ).parse() :
			mw.message( 'wikibasemediainfo-filepage-statement-no-value' ).parse();

	try {
		propertyId = this.propertyInput.getData().toJSON().id;
		dataValue = this.valueInput.getData();
		valuePromise = dataValue ?
			this.formatValue( dataValue, 'text/html', null, propertyId ) :
			$.Deferred().resolve( message ).promise( { abort: function () {} } );

		promises = [
			this.formatProperty( propertyId, 'text/html' ),
			valuePromise
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
 * @private
 * @param {datamodel.Snak} data
 * @return {datamodel.Snak}
 */
SnakWidget.prototype.cloneSnak = function ( data ) {
	var serializer = new serialization.SnakSerializer(),
		deserializer = new serialization.SnakDeserializer();

	return deserializer.deserialize( serializer.serialize( data ) );
};

/**
 * @return {Object[]} filters
 */
SnakWidget.prototype.getFilters = function () {
	var supportedTypes = mw.config.get( 'wbmiSupportedDataTypes' ) || [],
		uniqueTypes = supportedTypes.filter( function ( item, index, self ) {
			return self.indexOf( item ) === index;
		} );

	return [
		{ field: 'datatype', value: uniqueTypes.join( '|' ) }
	];
};

module.exports = SnakWidget;
