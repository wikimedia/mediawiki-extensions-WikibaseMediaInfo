( function ( search, statements, wb ) {

	'use strict';

	search.QualifierWidget = function MediaInfoSearchQualifierWidget( config ) {
		search.QualifierWidget.parent.call( this, config );

		this.terms = config.terms || {};
		this.properties = config.properties || {};

		this.operators = {
			is: {
				label: 'wikibasemediainfo-operator-value-is',
				input: true
			},
			isnot: {
				label: 'wikibasemediainfo-operator-value-isnot',
				input: true
			},
			isempty: {
				label: 'wikibasemediainfo-operator-value-isempty',
				input: false
			},
			isgreaterthan: {
				label: 'wikibasemediainfo-operator-value-isgreaterthan',
				input: true
			},
			islessthan: {
				label: 'wikibasemediainfo-operator-value-islessthan',
				input: true
			}
		};
		this.operatorsPerType = {
			'wikibase-entityid': [ 'is', 'isnot', 'isempty' ],
			quantity: [ 'is', 'isnot', 'isempty', 'isgreaterthan', 'islessthan' ],
			string: [ 'is', 'isnot', 'isempty' ]
		};

		this.removeIcon = new OO.ui.ButtonWidget( { classes: [ 'wbmi-search-qualifier-remove' ], framed: false, icon: 'close' } );
		this.removeIcon.connect( this, { click: [ 'emit', 'remove' ] } );

		this.propertyDropdown = new OO.ui.DropdownWidget();
		this.propertyDropdown.getMenu().connect( this, { select: 'populateOperatorDropdown' } );
		this.propertyDropdown.getMenu().connect( this, { select: 'populateValueInput' } );
		this.propertyDropdown.getMenu().connect( this, { select: [ 'emit', 'change' ] } );

		this.operatorDropdown = new OO.ui.DropdownWidget();
		this.operatorDropdown.getMenu().connect( this, { select: 'populateValueInput' } );
		this.operatorDropdown.getMenu().connect( this, { select: [ 'emit', 'change' ] } );

		this.valueInput = new statements.QualifierValueInputWidget();
		this.valueInput.connect( this, { change: [ 'emit', 'change' ] } );

		this.layout = new OO.ui.HorizontalLayout( {
			items: [
				this.removeIcon,
				this.propertyDropdown,
				this.operatorDropdown,
				this.valueInput
			],
			classes: [ 'wbmi-search-property' ]
		} );

		this.populatePropertiesDropdown();
		this.populateOperatorDropdown();
		this.populateValueInput();

		this.$element = this.layout.$element;
	};
	OO.inheritClass( search.QualifierWidget, OO.ui.Widget );
	OO.mixinClass( search.QualifierWidget, statements.FormatValueElement );

	/**
	 * @return {string}
	 */
	search.QualifierWidget.prototype.getTerm = function () {
		var data = this.getData(),
			params = $.extend( {}, data ),
			inputType = this.properties[ data.property ] || 'string',
			term = ( this.terms[ inputType ] || {} )[ data.operator ] || '',
			parseString = function ( string, variables ) {
				return string.replace( /\$\{(.+?)\}/g, function ( match, variable ) {
					return variables[ variable ] || match;
				} );
			};

		switch ( inputType ) {
			case 'wikibase-entityid':
				params.value = data.value ? data.value.toJSON().id : '';
				break;
			case 'quantity':
				params.value = data.value ? data.value.toJSON().amount.replace( /^\+/, '' ) : '';
				break;
			case 'string':
				params.value = data.value ? data.value.toJSON() : '';
				break;
			default:
				throw new Error( 'Unsupported type: ' + inputType );
		}

		return parseString( term, params );
	};

	/**
	 * @return {Object}
	 */
	search.QualifierWidget.prototype.getData = function () {
		var data = {},
			selectedProperty = this.propertyDropdown.getMenu().findSelectedItem(),
			selectedOperator = this.operatorDropdown.getMenu().findSelectedItem();

		data.property = selectedProperty ? selectedProperty.getData() : '';
		data.operator = selectedOperator ? selectedOperator.getData() : '';

		try {
			data.value = this.valueInput.getData();
		} catch ( e ) {
			// no data...
		}

		return data;
	};

	/**
	 * @param {Object} data
	 */
	search.QualifierWidget.prototype.setData = function ( data ) {
		if ( data.property ) {
			this.propertyDropdown.getMenu().selectItemByData( data.property );
		}

		if ( data.operator ) {
			this.operatorDropdown.getMenu().selectItemByData( data.operator );
		}

		if ( data.value ) {
			this.valueInput.setData( data.value );
		}
	};

	search.QualifierWidget.prototype.populatePropertiesDropdown = function () {
		var self = this;

		// reset dropdown
		this.propertyDropdown.getMenu().clearItems();
		this.propertyDropdown.setLabel( mw.message( 'wikibasemediainfo-property-placeholder' ).text() );

		Object.keys( this.properties ).forEach( function ( propertyId ) {
			// add all menu items
			self.propertyDropdown.getMenu().addItems( [
				new OO.ui.MenuOptionWidget( { data: propertyId } )
			] );
		} );

		this.propertyDropdown.setDisabled( this.propertyDropdown.getMenu().getItems().length === 0 );

		// now fetch the formatted values for all qualifier properties and update the
		// dropdown menu item's labels once we have them...
		$.when.apply( $, Object.keys( this.properties ).map( function ( propertyId ) {
			var dataValue = new wb.datamodel.EntityId( propertyId );
			return self.formatValue( dataValue, 'text/plain' );
		} ) ).then( function () {
			var selected = self.propertyDropdown.getMenu().findSelectedItem(),
				labels = arguments;

			// set property labels
			Object.keys( self.properties ).forEach( function ( propertyId, i ) {
				self.propertyDropdown.getMenu().findItemFromData( propertyId ).setLabel( labels[ i ] );
			} );

			// if one of the properties was already selected, reflect that in the dropdown's label
			if ( selected !== null ) {
				self.propertyDropdown.setLabel( selected.getLabel() );
			}
		} );
	};

	search.QualifierWidget.prototype.populateOperatorDropdown = function () {
		var self = this,
			data = this.getData(),
			inputType = this.properties[ data.property ];

		// reset dropdown
		this.operatorDropdown.getMenu().clearItems();
		this.operatorDropdown.setLabel( mw.message( 'wikibasemediainfo-operator-placeholder' ).text() );

		// add all menu items that apply for the selected property
		( this.operatorsPerType[ inputType ] || [] ).forEach( function ( operator ) {
			var data = self.operators[ operator ];

			self.operatorDropdown.menu.addItems( [
				new OO.ui.MenuOptionWidget( {
					data: operator,
					label: mw.message( data.label ).text()
				} )
			] );
		} );

		// select previously selected data (if still available in new values)
		this.operatorDropdown.menu.selectItemByData( data.operator );

		// mark as disabled if there are no items
		this.operatorDropdown.setDisabled( this.operatorDropdown.getMenu().getItems().length === 0 );
	};

	search.QualifierWidget.prototype.populateValueInput = function () {
		var data = this.getData(),
			inputType = this.properties[ data.property ],
			operator = this.operators[ data.operator ];

		// update input to reflect the correct type for this property
		this.valueInput.setInputType( inputType || 'string' );

		// mark as disabled if the selected operator doesn't support input
		this.valueInput.setDisabled( !operator || operator.input === false );
	};

}( mw.mediaInfo.search, mw.mediaInfo.statements, wikibase ) );
