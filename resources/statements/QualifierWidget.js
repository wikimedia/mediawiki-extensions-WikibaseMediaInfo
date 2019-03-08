( function ( statements, wb ) {

	'use strict';

	/**
	 * @constructor
	 * @param {Object} config Configuration options
	 * @param {Object} config.qualifiers Qualifiers map: { propertyId: datatype, ...}
	 * @param {Object} config.externalEntitySearchApiUri
	 */
	statements.QualifierWidget = function MediaInfoStatementsQualifierWidget( config ) {
		statements.QualifierWidget.parent.call( this, config );
		statements.FormatValueElement.call( this, $.extend( {}, config ) );

		this.qualifiers = config.qualifiers || {};

		this.valueWidget = new OO.ui.Widget( { classes: [ 'wbmi-qualifier-value' ] } );

		this.removeIcon = new OO.ui.ButtonWidget( { classes: [ 'wbmi-qualifier-remove' ], framed: false, icon: 'close' } );
		this.removeIcon.connect( this, { click: [ 'emit', 'delete' ] } );

		this.propertyDropdown = new OO.ui.DropdownWidget();
		this.propertyDropdown.getMenu().connect( this, { select: 'populateValueInput' } );
		this.propertyDropdown.getMenu().connect( this, { select: 'updateValueWidget' } );
		this.propertyDropdown.getMenu().connect( this, { select: [ 'emit', 'change' ] } );
		this.populatePropertiesDropdown();

		this.valueInput = new statements.QualifierValueInputWidget( {
			externalEntitySearchApiUri: config.externalEntitySearchApiUri
		} );
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
	OO.inheritClass( statements.QualifierWidget, OO.ui.Widget );
	OO.mixinClass( statements.QualifierWidget, statements.FormatValueElement );

	/**
	 * @return {wikibase.datamodel.PropertyValueSnak}
	 */
	statements.QualifierWidget.prototype.getData = function () {
		var property = this.propertyDropdown.getMenu().findSelectedItem(),
			snak = new wb.datamodel.PropertyValueSnak(
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
	statements.QualifierWidget.prototype.setData = function ( data ) {
		this.data = data;

		this.propertyDropdown.getMenu().selectItemByData( data.getPropertyId() );
		this.valueInput.setData( data.getValue() );
	};

	/**
	 * @return {jQuery.Promise}
	 */
	statements.QualifierWidget.prototype.updateValueWidget = function () {
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

			return this.updatePromise;
		} catch ( e ) {
			// nothing to render if data is invalid...
		}
	};

	statements.QualifierWidget.prototype.populatePropertiesDropdown = function () {
		var self = this;

		// reset dropdown
		this.propertyDropdown.getMenu().clearItems();
		this.propertyDropdown.setLabel( mw.message( 'wikibasemediainfo-property-placeholder' ).text() );

		Object.keys( this.qualifiers ).forEach( function ( propertyId ) {
			// add all menu items
			self.propertyDropdown.getMenu().addItems( [
				new OO.ui.MenuOptionWidget( { data: propertyId } )
			] );
		} );

		this.propertyDropdown.setDisabled( this.propertyDropdown.getMenu().getItems().length === 0 );

		// now fetch the formatted values for all qualifier properties and update the
		// dropdown menu item's labels once we have them...
		$.when.apply( $, Object.keys( this.qualifiers ).map( function ( propertyId ) {
			var dataValue = new wb.datamodel.EntityId( propertyId );
			return self.formatValue( dataValue, 'text/plain' );
		} ) ).then( function () {
			var selected = self.propertyDropdown.getMenu().findSelectedItem(),
				labels = arguments;

			// set property labels
			Object.keys( self.qualifiers ).forEach( function ( propertyId, i ) {
				self.propertyDropdown.getMenu().findItemFromData( propertyId ).setLabel( labels[ i ] );
			} );

			// if one of the properties was already selected, reflect that in the dropdown's label
			if ( selected !== null ) {
				self.propertyDropdown.setLabel( selected.getLabel() );
			}

			self.updateValueWidget();
		} );
	};

	statements.QualifierWidget.prototype.populateValueInput = function () {
		var property = this.propertyDropdown.getMenu().findSelectedItem().getData();

		// update input to reflect the correct type for this property
		this.valueInput.setInputType( this.qualifiers[ property ] );

		this.valueInput.setDisabled( false );
	};

}( mw.mediaInfo.statements, wikibase ) );
