( function ( statements, dv ) {

	'use strict';

	statements.QualifierValueInputWidget =
		function MediaInfoStatementsQualifierValueInputWidget( config ) {
			this.config = $.extend( {}, config );

			statements.QualifierValueInputWidget.parent.call( this, this.config );
			statements.FormatValueElement.call( this, $.extend( {}, config ) );

			this.setInputType( this.type || 'string' );
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

		switch ( type ) {
			case 'wikibase-entityid':
				this.input = new statements.EntityInputWidget( this.config );
				this.input.connect( this, { dataChange: [ 'emit', 'change' ] } );
				this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
				break;
			case 'quantity':
				this.input = new OO.ui.NumberInputWidget( this.config );
				this.input.connect( this, { change: [ 'emit', 'change' ] } );
				this.input.connect( this, { enter: [ 'emit', 'enter' ] } );
				break;
			case 'string':
				this.input = new OO.ui.TextInputWidget( this.config );
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
	 * @return {Object|string}
	 */
	statements.QualifierValueInputWidget.prototype.getInputValue = function () {
		switch ( this.type ) {
			case 'wikibase-entityid':
				return {
					id: this.input.getData()
				};
			case 'quantity':
				return {
					// add leading '+' if no unit is present already
					amount: this.input.getValue().replace( /^(?![+-])/, '+' ),
					// @todo not currently required, but we might need to implement support
					// for units some day...
					unit: '1'
				};
			case 'string':
				return this.input.getValue();
		}

		throw new Error( 'Unsupported type: ' + this.type );
	};

	/**
	 * @return {dataValues.DataValue}
	 */
	statements.QualifierValueInputWidget.prototype.getData = function () {
		return dv.newDataValue( this.type, this.value || this.getInputValue() );
	};

	/**
	 * @param {dataValues.DataValue} data
	 * @chainable
	 */
	statements.QualifierValueInputWidget.prototype.setData = function ( data ) {
		var self = this;

		this.setInputType( data.getType() );
		this.setDisabled( false );

		// temporarily save the value so that getValue() calls before below
		// promise has resolved will already respond with the correct value,
		// even though the input field doesn't have it yet...
		this.value = data.getValue().toJSON();

		this.formatValue( data, 'text/plain' ).then( function ( plain ) {
			switch ( data.getType() ) {
				case 'wikibase-entityid':
					// entities widget will need to be aware of the id that is associated
					// with the label
					self.input.setValue( plain );
					self.input.setData( data.toJSON().id );
					break;
				case 'quantity':
					// replace thousands delimiter - that's only useful for display purposed
					self.input.setValue( plain.replace( ',', '' ) );
					break;
				case 'string':
					self.input.setValue( plain );
					break;
			}

			// reset temporary value workaround - we can now interact with the
			// value, so we should fetch the result straight from input field
			self.value = undefined;
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

}( mw.mediaInfo.statements, dataValues ) );
