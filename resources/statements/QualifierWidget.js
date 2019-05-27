'use strict';

var FormatValueElement = require( './FormatValueElement.js' ),
	QualifierValueInputWidget = require( './QualifierValueInputWidget.js' ),
	/**
	 * @constructor
	 * @param {Object} config Configuration options
	 * @param {Object} config.qualifiers Qualifiers map: { propertyId: datatype, ...}
	 */
	QualifierWidget = function MediaInfoStatementsQualifierWidget( config ) {
		config = config || {};

		QualifierWidget.parent.call( this, config );
		FormatValueElement.call( this, $.extend( {}, config ) );

		this.config = config;
		this.qualifiers = config.qualifiers || {};

		this.valueWidget = new OO.ui.Widget( { classes: [ 'wbmi-qualifier-value' ] } );

		this.removeIcon = new OO.ui.ButtonWidget( { classes: [ 'wbmi-qualifier-remove' ], framed: false, icon: 'close' } );
		this.removeIcon.connect( this, { click: [ 'emit', 'delete' ] } );

		this.propertyDropdown = new OO.ui.DropdownWidget( { classes: [ 'wbmi-qualifier-property' ] } );
		this.propertyDropdown.getMenu().connect( this, { select: 'populateValueInput' } );
		this.propertyDropdown.getMenu().connect( this, { select: 'updateValueWidget' } );
		this.propertyDropdown.getMenu().connect( this, { select: [ 'emit', 'change' ] } );
		this.populatePropertiesDropdown();

		this.valueInput = new QualifierValueInputWidget( { classes: [ 'wbmi-qualifier-value-input' ] } );
		this.valueInput.connect( this, { change: 'updateValueWidget' } );
		this.valueInput.connect( this, { change: [ 'emit', 'change' ] } );
		// disable - will be enabled once a property has been selected
		this.valueInput.setDisabled( true );

		this.layout = new OO.ui.HorizontalLayout( {
			items: [
				this.valueWidget,
				this.propertyDropdown,
				this.valueInput,
				this.removeIcon
			],
			classes: [ 'wbmi-qualifier' ]
		} );

		this.$element = this.layout.$element;
	};
OO.inheritClass( QualifierWidget, OO.ui.Widget );
OO.mixinClass( QualifierWidget, FormatValueElement );

/**
 * @chainable
 * @return {OO.ui.Element} The element, for chaining
 */
QualifierWidget.prototype.focus = function () {
	this.propertyDropdown.focus();
	return this;
};

/**
 * @return {wikibase.datamodel.PropertyValueSnak}
 */
QualifierWidget.prototype.getData = function () {
	var property = this.propertyDropdown.getMenu().findSelectedItem(),
		snak = new wikibase.datamodel.PropertyValueSnak(
			property.getData(),
			this.valueInput.getData()
		);

	// if snak hasn't changed since `this.setData`,
	// return the original data (which includes `hash`)
	return this.data && this.data.equals( snak ) ? this.data : snak;
};

/**
 * @param {wikibase.datamodel.PropertyValueSnak} data
 */
QualifierWidget.prototype.setData = function ( data ) {
	this.data = data;

	// make sure the property exists in the dropdown (it's supposed to be,
	// but it's not unthinkable someone crafted an API call to add a property
	// that's not configured, or that we've changed our minds and updated
	// the list of properties...)
	this.qualifiers = $.extend( {}, this.config.qualifiers );
	this.qualifiers[ data.getPropertyId() ] = data.getValue().getType();
	this.populatePropertiesDropdown();

	this.propertyDropdown.getMenu().selectItemByData( data.getPropertyId() );
	this.valueInput.setData( data.getValue() );
};

QualifierWidget.prototype.updateValueWidget = function () {
	var self = this,
		data, dataValue;

	try {
		data = this.getData();
		dataValue = data.getValue();

		// abort in-flight API requests - there's no point in continuing
		// to fetch the text-to-render when we've already changed it...
		if ( this.updatePromise ) {
			this.updatePromise.abort();
		}

		// if the value input is not empty, format it
		this.updatePromise = this.formatValue( dataValue, 'text/plain' );
		this.updatePromise.then( function ( plain ) {
			self.valueWidget.$element.text(
				( self.propertyDropdown.getMenu().findSelectedItem().getLabel() || '' ) +
				mw.message( 'colon-separator' ).text() +
				plain
			);
		} );
	} catch ( e ) {
		// nothing to render if data is invalid...
	}
};

/**
 * @param {string} propertyId
 * @return {jQuery.Promise}
 */
QualifierWidget.prototype.addProperty = function ( propertyId ) {
	var self = this,
		dataValue = new wikibase.datamodel.EntityId( propertyId );

	// skip if property already exists in dropdown
	if ( this.propertyDropdown.getMenu().findItemFromData( propertyId ) !== null ) {
		return $.Deferred().resolve().promise();
	}

	// add property to dropdown
	this.propertyDropdown.getMenu().addItems( [
		new OO.ui.MenuOptionWidget( { data: propertyId } )
	] );

	// enable dropdown now that it has items
	this.propertyDropdown.setDisabled( false );

	// now fetch the formatted value for the property and update the
	// dropdown menu item's label
	return self.formatValue( dataValue, 'text/plain' ).then( function ( formatted ) {
		// set property label
		var item = self.propertyDropdown.getMenu().findItemFromData( propertyId );
		item.setLabel( formatted );
		if ( item.isSelected() ) {
			self.propertyDropdown.setLabel( formatted );
			self.updateValueWidget();
		}
	} );
};

QualifierWidget.prototype.populatePropertiesDropdown = function () {
	// reset dropdown
	this.propertyDropdown.getMenu().clearItems();
	this.propertyDropdown.setLabel( mw.message( 'wikibasemediainfo-property-placeholder' ).text() );
	this.propertyDropdown.setDisabled( true );

	Object.keys( this.qualifiers ).forEach( this.addProperty.bind( this ) );
};

QualifierWidget.prototype.populateValueInput = function () {
	var property = this.propertyDropdown.getMenu().findSelectedItem().getData();

	// update input to reflect the correct type for this property
	this.valueInput.setInputType( this.qualifiers[ property ] );

	this.valueInput.setDisabled( false );
};

module.exports = QualifierWidget;
