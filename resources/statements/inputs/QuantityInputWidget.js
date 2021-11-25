'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	EntityAutocompleteInputWidget = require( './EntityAutocompleteInputWidget.js' ),
	AbstractInputWidget = require( './AbstractInputWidget.js' ),
	QuantityInputWidget;

/**
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier]
 */
QuantityInputWidget = function MediaInfoStatementsQuantityInputWidget( config ) {
	config = config || {};

	this.state = {
		amount: false,
		unit: '1',
		showUnitInput: false,
		isQualifier: !!config.isQualifier,
		isActive: false
	};

	this.input = new OO.ui.TextInputWidget( {
		type: 'text',
		classes: [ 'wbmi-input-widget__input' ],
		isRequired: true
	} );

	this.unit = new EntityAutocompleteInputWidget( {
		classes: [ 'wbmi-input-widget__input', 'wbmi-input-widget--unit' ],
		placeholder: mw.msg( 'wikibasemediainfo-quantity-unit-placeholder' ),
		icon: 'search',
		label: mw.msg( 'wikibasemediainfo-quantity-unit-label' )
	} );

	this.bindEventHandlers();

	QuantityInputWidget.parent.call( this );
	AbstractInputWidget.call( this, config );
	ComponentWidget.call(
		this,
		'wikibase.mediainfo.statements',
		'templates/statements/inputs/QuantityInputWidget.mustache+dom'
	);
};
OO.inheritClass( QuantityInputWidget, OO.ui.Widget );
OO.mixinClass( QuantityInputWidget, AbstractInputWidget );
OO.mixinClass( QuantityInputWidget, ComponentWidget );

QuantityInputWidget.prototype.bindEventHandlers = function () {
	this.debouncedOnChange = OO.ui.debounce( this.onChange.bind( this ), 200 );
	this.onFocusHandler = this.onFocus.bind( this );

	this.input.connect( this, { enter: 'onEnter' } );
	this.input.$input.on( 'focus', this.onFocusHandler );
	this.input.connect( this, { change: this.debouncedOnChange } );

	this.unit.connect( this, { change: 'onChangeUnit' } );
	this.unit.connect( this, { add: 'onSelectUnit' } );
};

QuantityInputWidget.prototype.unbindEventHandlers = function () {
	this.input.disconnect( this, { enter: 'onEnter' } );
	this.input.$input.off( 'focus', this.onFocusHandler );
	this.input.disconnect( this, { change: this.debouncedOnChange } );

	this.unit.disconnect( this, { change: 'onChangeUnit' } );
	this.unit.disconnect( this, { add: 'onSelectUnit' } );
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getTemplateData = function () {
	var submitButton, addUnitButton, removeUnitButton;

	submitButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-input-widget__button', 'wbmi-input-widget--submit' ],
		label: mw.msg( 'wikibasemediainfo-quantity-input-button-text' ),
		flags: [ 'progressive' ],
		disabled: !this.hasValidInput()
	} );
	submitButton.connect( this, { click: 'onEnter' } );

	addUnitButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-input-widget__button', 'wbmi-input-widget--add-unit' ],
		label: mw.msg( 'wikibasemediainfo-quantity-unit-button-text' ),
		icon: 'add',
		flags: [ 'progressive' ]
	} );
	addUnitButton.connect( this, { click: [ 'setState', { showUnitInput: true } ] } );

	removeUnitButton = new OO.ui.ButtonWidget( {
		classes: [ 'wbmi-input-widget__button', 'wbmi-input-widget--remove-unit' ],
		icon: 'trash',
		flags: [ 'destructive' ]
	} );
	removeUnitButton.connect( this, { click: 'onRemoveUnit' } );

	// if a unit has been selected, disable the input field & remove search icon
	this.unit.setDisabled( this.state.unit !== '1' );
	this.unit.setIcon( this.state.unit === '1' ? 'search' : undefined );

	return {
		isQualifier: this.state.isQualifier,
		isActive: this.state.isActive,
		input: this.input,
		showUnitInput: this.state.unit !== '1' || this.state.showUnitInput,
		unit: this.state.unit,
		hasUnit: this.state.unit !== '1',
		unitInput: this.unit,
		submitButton: submitButton,
		addUnitButton: addUnitButton,
		removeUnitButton: removeUnitButton
	};
};

QuantityInputWidget.prototype.onEnter = function () {
	if ( this.hasValidInput() ) {
		this.emit( 'add', this );
	}
};

QuantityInputWidget.prototype.onFocus = function () {
	this.setState( { isActive: true } );
};

QuantityInputWidget.prototype.onChange = function ( value ) {
	var self = this;

	if ( this.parseValuePromise ) {
		// abort existing API calls if input has changed
		this.parseValuePromise.abort();
	}

	if ( value === '' ) {
		this.setState( { amount: false, isActive: false } ).then( this.emit.bind( this, 'change', this ) );
		return;
	}

	this.parseValuePromise = this.parseValue( undefined, 'quantity' );
	this.parseValuePromise
		.then( function ( dataValue ) {
			var json = dataValue.toJSON();

			return self.setState( {
				amount: json.amount,
				isActive: true
			} ).then( self.input.setValidityFlag.bind( self.input, true ) );
		} )
		.catch( function () {
			return self.setState( { amount: false, isActive: true } )
				.then( self.input.setValidityFlag.bind( self.input, false ) );
		} )
		.always( this.emit.bind( this, 'change', this ) );
};

/**
 * OnChangeUnit is triggered as users type, and `text` is the text in
 * the input field. Any textual change will be treated as "no unit",
 * until an actual value gets selected (see `onSelectUnit`)
 */
QuantityInputWidget.prototype.onChangeUnit = function () {
	this.input.setLabel( '' );

	this.setState( { unit: '1' } )
		.then( this.emit.bind( this, 'change', this ) );
};

/**
 * onSelectUnit is triggered when users select a valid input type from
 * the autocomplete. Any entity is allowed.
 *
 * @param {Object} data
 */
QuantityInputWidget.prototype.onSelectUnit = function ( data ) {
	this.input.setLabel( data.label );

	this.setState( {
		unit: data.concepturi,
		isActive: false
	} ).then( this.emit.bind( this, 'change', this ) );
};

QuantityInputWidget.prototype.onRemoveUnit = function () {
	this.input.setLabel( '' );
	this.unit.setData( undefined );

	this.setState( {
		isActive: false,
		showUnitInput: false,
		unit: '1'
	} ).then( this.emit.bind( this, 'change', this ) );
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getRawValue = function () {
	return this.input.getValue();
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getRawValueOptions = function () {
	return { unit: this.state.unit };
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.getData = function () {
	if ( this.state.amount === false ) {
		throw new Error( 'No valid amount' );
	}

	return dataValues.newDataValue( 'quantity', {
		amount: this.state.amount,
		unit: this.state.unit
	} );
};

/**
 * @return {boolean}
 */
QuantityInputWidget.prototype.hasValidInput = function () {
	try {
		this.getData();
		return true;
	} catch ( e ) {
		return false;
	}
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.setData = function ( data ) {
	var self = this,
		json = data.toJSON(),
		existing;

	try {
		existing = self.getData();
	} catch ( e ) {
		// no existing data, that's alright...
	}

	this.unbindEventHandlers();

	// replace leading '+' unit - that's only needed for internal storage,
	// but obvious for human input
	this.input.setValue( json.amount.replace( /^\+/, '' ) );

	// remove base uri for display - it's also only needed for storage
	return this.unit.setData( json.unit === '1' ? '' : json.unit.replace( /^.*(Q[0-9]+)$/, '$1' ) )
		.then( this.bindEventHandlers.bind( this ) )
		.then( this.setState.bind( this, {
			// this input is a little annoying: it will not emit an
			// 'add' event (which contains the concepturi) on `setData`;
			// only a 'change' event: that will then invalidate the unit,
			// so we'll make sure to override that again...
			amount: json.amount,
			unit: json.unit,
			isActive: false,
			showUnitInput: json.unit !== '1'
		} ) )
		.then( function () {
			// update input field label to reflect unit text
			self.input.setLabel( self.unit.getValue() );

			if ( !data.equals( existing ) ) {
				self.emit( 'change', self );
			}
			return self.$element;
		} );
};

/**
 * @inheritdoc
 */
QuantityInputWidget.prototype.clear = function () {
	this.unbindEventHandlers();

	this.input.setValue( '' );
	this.input.setLabel( '' );
	this.unit.setData( undefined );

	this.bindEventHandlers();

	return this.setState( {
		amount: false,
		unit: '1',
		isActive: false,
		showUnitInput: false
	} );
};

/**
 * @inheritdoc
 */
QuantityInputWidget.prototype.focus = function () {
	this.input.focus();
};

/**
 * @inheritdoc
 */
QuantityInputWidget.prototype.setDisabled = function ( disabled ) {
	this.input.setDisabled( disabled );
	this.unit.setDisabled( disabled );
	ComponentWidget.prototype.setDisabled.call( this, disabled );
};

/**
 * @inheritDoc
 */
QuantityInputWidget.prototype.flagAsInvalid = function () {
	this.input.setValidityFlag( false );
};

module.exports = QuantityInputWidget;
