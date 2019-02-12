( function ( statements ) {

	'use strict';

	/**
	 * @constructor
	 * @param {Object} config Configuration options
	 * @param {Array} [config.properties] Properties data: array of { id: x, label: x, input: x } data
	 */
	statements.QualifierWidget = function MediaInfoStatementsQualifierWidget( config ) {
		statements.QualifierWidget.parent.call( this, config );
		statements.FormatValueElement.call( this, $.extend( {}, config ) );

		this.propertiesData = config.properties || { '': { id: '', label: '', input: 'string' } };

		this.valueWidget = new OO.ui.Widget( { classes: [ 'wbmi-qualifier-value' ] } );

		this.removeIcon = new OO.ui.ButtonWidget( { classes: [ 'wbmi-qualifier-remove' ], framed: false, icon: 'close' } );
		this.removeIcon.connect( this, { click: [ 'emit', 'delete' ] } );

		this.propertyDropdown = new OO.ui.DropdownWidget();
		this.propertyDropdown.menu.connect( this, { select: 'populateValueInput' } );
		this.propertyDropdown.menu.connect( this, { select: 'updateValueWidget' } );
		this.propertyDropdown.menu.connect( this, { select: [ 'emit', 'change' ] } );

		this.valueInput = new statements.QualifierValueInputWidget();
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

		this.populatePropertiesDropdown();

		this.$element = this.layout.$element;
	};
	OO.inheritClass( statements.QualifierWidget, OO.ui.Widget );
	OO.mixinClass( statements.QualifierWidget, statements.FormatValueElement );

	/**
	 * @return {Object}
	 */
	statements.QualifierWidget.prototype.getData = function () {
		var property = this.propertyDropdown.getMenu().findSelectedItem();

		return {
			snaktype: 'value',
			property: property.getData(),
			datavalue: this.valueInput.getData()
		};
	};

	/**
	 * @param {Object} data
	 */
	statements.QualifierWidget.prototype.setData = function ( data ) {
		this.populatePropertiesDropdown();
		this.propertyDropdown.getMenu().selectItemByData( data.property );
		this.valueInput.setData( data.datavalue );

		this.updateValueWidget();
	};

	/**
	 * @return {jQuery.Promise}
	 */
	statements.QualifierWidget.prototype.updateValueWidget = function () {
		var self = this,
			data = this.getData();

		return this.formatValue( data.datavalue, 'text/plain' ).then( function ( response ) {
			var propertyKey = Object.keys( self.propertiesData ).filter( function ( key ) {
					return self.propertiesData[ key ].id === data.property;
				} )[ 0 ],
				propertyData = self.propertiesData[ propertyKey ];

			self.valueWidget.$element.text(
				mw.message( propertyData.label ).text() + // @todo there's a better way... (e.g. formatting actual value)
				mw.message( 'colon-separator' ).text() +
				response.result
			);
		} );
	};

	statements.QualifierWidget.prototype.populatePropertiesDropdown = function () {
		var self = this;

		// reset dropdown
		this.propertyDropdown.menu.clearItems();
		this.propertyDropdown.setLabel( mw.message( self.propertiesData[ '' ].label ).text() );
		this.propertyDropdown.setDisabled( true );

		// add all menu items
		Object.keys( this.propertiesData ).forEach( function ( property ) {
			var data = self.propertiesData[ property ];

			if ( property === '' ) {
				// skip empty property, it only serves as data fallback for when
				// nothing is selected, but shouldn't be displayed
				return;
			}

			self.propertyDropdown.menu.addItems( [
				new OO.ui.MenuOptionWidget( {
					data: data.id,
					label: mw.message( data.label ).text() // @todo there's a better way... (e.g. formatting actual value)
				} )
			] );
		} );

		// mark as disabled if there are no items
		this.propertyDropdown.setDisabled( this.propertyDropdown.menu.getItems().length === 0 );
	};

	statements.QualifierWidget.prototype.populateValueInput = function () {
		var self = this,
			property = this.propertyDropdown.getMenu().findSelectedItem().getData(),
			key = Object.keys( this.propertiesData ).filter( function ( key ) {
				return self.propertiesData[ key ].id === property;
			} )[ 0 ],
			data = this.propertiesData[ key ];

		// update input to reflect the correct type for this property
		this.valueInput.setInputType( data.input );

		this.valueInput.setDisabled( false );
	};

}( mw.mediaInfo.statements ) );
