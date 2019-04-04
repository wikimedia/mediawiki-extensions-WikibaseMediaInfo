( function ( statements ) {

	'use strict';

	statements.EntityInputWidget = function MediaInfoStatementsEntityInputWidget( config ) {
		statements.EntityInputWidget.parent.call( this, $.extend( {}, config, {
			classes: [ 'wbmi-entity-input-widget' ]
		} ) );

		statements.EntityLookupElement.call( this, $.extend( {}, config, {
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false
		} ) );

		OO.ui.mixin.FlaggedElement.call( this, $.extend( {}, config, {
			$flagged: this.$element
		} ) );

		this.data = undefined;

		// mapLabelId will temporarily store entity label => id mappings of
		// entities that have been selected, so that if we somehow then alter
		// the text (add characters, remove some) and then adjust our typing to
		// form the originally selected item, it'll recognize it and know what
		// the id was, without us having to select it anew
		this.mapLabelId = {};
	};
	OO.inheritClass( statements.EntityInputWidget, OO.ui.TextInputWidget );
	OO.mixinClass( statements.EntityInputWidget, OO.ui.mixin.FlaggedElement );
	OO.mixinClass( statements.EntityInputWidget, statements.EntityLookupElement );

	/**
	 * @inheritdoc
	 */
	statements.EntityInputWidget.prototype.onLookupMenuItemChoose = function ( item ) {
		var data = item.getData();

		this.mapLabelId[ data.label ] = data.id;
		this.setData( data.id );
		this.setValue( data.label );

		this.emit( 'choose', item );
	};

	/**
	 * This will return the actual value that can be used (= the entity id)
	 * This is different from 'getValue', which will return the text (= entity
	 * label) in the input value (and we can't change that because
	 * LookupElement relies on it working like that)
	 * Instead, this will return the data associated with the value in the
	 * input field, as selected from the LookupElement.
	 *
	 * @return {string}
	 */
	statements.EntityInputWidget.prototype.getData = function () {
		return this.data;
	};

	/**
	 * Value selected from LookupElement, or passed in programmatically.
	 *
	 * @param {string} data
	 * @chainable
	 * @return {EntityInputWidget}
	 */
	statements.EntityInputWidget.prototype.setData = function ( data ) {
		this.data = data;
		this.setFlags( { destructive: false } );
		this.emit( 'dataChange', this.data );

		return this;
	};

	/**
	 * Manual textarea input.
	 *
	 * @inheritdoc
	 */
	statements.EntityInputWidget.prototype.setValue = function ( value ) {
		value = this.cleanUpValue( value );

		if ( value && value in this.mapLabelId ) {
			// input (label) is one we've already selected, we still know the id
			if ( this.getData() !== this.mapLabelId[ value ] ) {
				this.setData( this.mapLabelId[ value ] );
			}
		} else {
			// unknown input - mark as invalid input, until something gets selected
			this.data = undefined;
			// don't set destructive flag just yet, we may still be entering a search
			// term and don't want it to turn destructive until we've had a chance to
			// select the value - we'll update set the state on blur
		}

		statements.EntityInputWidget.parent.prototype.setValue.call( this, value );

		return this;
	};

	/**
	 * @inheritdoc
	 */
	statements.EntityInputWidget.prototype.onBlur = function () {
		statements.EntityInputWidget.parent.prototype.onBlur.call( this );

		// verify that this.data (which should contain the entity id) is set
		// if not, mark the input as destructive to indicate the value is invalid
		if ( this.data === undefined ) {
			this.setFlags( { destructive: true } );
		} else {
			this.setFlags( { destructive: false } );
		}
	};

}( mw.mediaInfo.statements ) );
