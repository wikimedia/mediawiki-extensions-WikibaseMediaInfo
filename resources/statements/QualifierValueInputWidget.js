( function ( statements ) {

	'use strict';

	statements.QualifierValueInputWidget =
		function MediaInfoStatementsQualifierValueInputWidget( config ) {
			this.config = $.extend( {}, config );

			statements.QualifierValueInputWidget.parent.call( this, this.config );
			statements.FormatValueElement.call( this, $.extend( {}, config ) );

			this.setInputType( this.config.type || 'wikibase-entityid' );
		};
	OO.inheritClass( statements.QualifierValueInputWidget, OO.ui.Widget );
	OO.mixinClass( statements.QualifierValueInputWidget, statements.FormatValueElement );

	/**
	 * QualifierValueInputWidget is basically a wrapper for multiple different
	 * input types - this'll let you change the input type.
	 *
	 * @param {string} type One of 'wikibase-entityid', 'quantity' or 'string'
	 * @chainable
	 */
	statements.QualifierValueInputWidget.prototype.setInputType = function ( type ) {
		if ( this.type === type ) {
			// nothing's changed, move along
			return;
		}

		// remove existing element from DOM
		if ( this.input ) {
			this.input.$element.remove();
		}

		this.type = type;
		this.value = {};

		switch ( type ) {
			case 'wikibase-entityid':
				this.input = new statements.EntityInputWidget( this.config );
				this.input.connect( this, { dataChange: 'onValueChange' } );
				this.input.connect( this, { dataChange: [ 'emit', 'change' ] } );
				this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
				break;
			case 'quantity':
				this.input = new OO.ui.NumberInputWidget( this.config );
				this.input.connect( this, { change: 'onValueChange' } );
				this.input.connect( this, { change: [ 'emit', 'change' ] } );
				this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
				break;
			case 'string':
				this.input = new OO.ui.TextInputWidget( this.config );
				this.input.connect( this, { change: 'onValueChange' } );
				this.input.connect( this, { change: [ 'emit', 'change' ] } );
				this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
				break;
			default:
				throw new Error( 'Unsupported qualifier input value type: ' + type );
		}

		// add the new element
		this.$element.append( this.input.$element );

		return this;
	};

	/**
	 * @return {Object}
	 */
	statements.QualifierValueInputWidget.prototype.onValueChange = function () {
		switch ( this.type ) {
			case 'wikibase-entityid':
				this.value = {
					id: this.input.getData()
				};
				break;
			case 'quantity':
				this.value = {
					// add leading '+' if no unit is present already
					amount: this.input.getValue().replace( /^(?![+-])/, '+' ),
					// @todo not currently required, but we might need to implement support
					// for units some day...
					unit: '1'
				};
				break;
			case 'string':
				this.value = this.input.getValue();
				break;
		}
	};

	/**
	 * @return {Object}
	 */
	statements.QualifierValueInputWidget.prototype.getData = function () {
		return {
			type: this.type,
			value: this.value
		};
	};

	/**
	 * @param {Object} data
	 * @chainable
	 */
	statements.QualifierValueInputWidget.prototype.setData = function ( data ) {
		var self = this;

		this.setInputType( data.type );
		this.setDisabled( false );

		this.value = data.value;

		this.formatValue( data, 'text/plain' ).then( function ( response ) {
			self.input.setValue( response.result );

			if ( data.type === 'wikibase-entityid' ) {
				// entities widget will need to be aware of the id that is associated
				// with the label
				self.input.setData( data.value.id );
			}
		} );

		return this;
	};

	/**
	 * @param {Mixed} value
	 * @chainable
	 */
	statements.QualifierValueInputWidget.prototype.setValue = function ( value ) {
		return this.input.setValue( value );
	};

	/**
	 * @return {Mixed}
	 */
	statements.QualifierValueInputWidget.prototype.getValue = function () {
		return this.input.getValue();
	};

	/**
	 * @return {boolean}
	 */
	statements.QualifierValueInputWidget.prototype.isDisabled = function () {
		return this.input.isDisabled();
	};

	/**
	 * @param {boolean} disabled
	 * @chainable
	 */
	statements.QualifierValueInputWidget.prototype.setDisabled = function ( disabled ) {
		if ( this.input === undefined ) {
			// ignore this call from parent constructor; input will be constructed
			// with the correct config later on
			return this;
		}

		return this.input.setDisabled( disabled );
	};

}( mw.mediaInfo.statements ) );
