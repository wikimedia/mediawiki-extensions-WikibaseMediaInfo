( function ( search, statements ) {

	'use strict';

	search.DepictsInputWidget = function MediaInfoSearchDepictsInputWidget( config ) {
		search.DepictsInputWidget.parent.call( this, $.extend( {}, config, {
			allowArbitrary: false
		} ) );

		OO.ui.mixin.PendingElement.call( this, $.extend( {}, config, {
			$pending: this.$handle
		} ) );

		// LookupElement expects this.$input
		this.$input = this.input.$input;

		statements.EntityLookupElement.call( this, $.extend( {}, config, {
			allowSuggestionsWhenEmpty: false,
			highlightFirst: false,
			type: 'item'
		} ) );

		// LookupElement will usually bind to a TextInputWidget's 'change', but
		// this is a different element, and 'change' is emitted in different
		// circumstances, so we'll need to make sure it's triggered when input changes
		this.input.$input.on( { input: this.onLookupInputChange.bind( this ) } );

		this.connect( this, { choose: 'onChoose' } );
	};
	OO.inheritClass( search.DepictsInputWidget, OO.ui.TagMultiselectWidget );
	OO.mixinClass( search.DepictsInputWidget, OO.ui.mixin.PendingElement );
	OO.mixinClass( search.DepictsInputWidget, statements.EntityLookupElement );

	/**
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.getLookupRequest = function () {
		var promise = statements.EntityLookupElement.prototype.getLookupRequest.call( this );
		this.pushPending();
		promise.always( this.popPending.bind( this ) );
		return promise;
	};

	/**
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.getTerm = function () {
		return this.getItems().map( function ( item ) {
			return item.getTerm();
		} ).join( ' ' );
	};

	/**
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.onInputKeyDown = function ( e ) {
		if (
			!this.isDisabled() &&
			this.input.getValue() === '' &&
			this.items.length &&
			e.which === OO.ui.Keys.ENTER
		) {
			this.emit( 'enter', e );
		} else {
			search.DepictsInputWidget.parent.prototype.onInputKeyDown.call( this, e );
		}
	};

	/**
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.onInputFocus = function () {
		search.DepictsInputWidget.parent.prototype.onInputFocus.call( this );
		this.emit( 'focus' );
	};

	/**
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.onInputBlur = function () {
		search.DepictsInputWidget.parent.prototype.onInputBlur.call( this );
		this.emit( 'blur' );
	};

	/**
	 * Create custom item thingy, that doesn't become editable when clicked, but shows
	 * a popover to further customize the search.
	 *
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.createItemWidget = function ( data, label ) {
		if ( label === '' ) {
			return null;
		}

		return new search.CapsuleItemWidget( {
			property: mw.config.get( 'wbmiProperties' ).depicts,
			qualifiers: mw.config.get( 'wbmiDepictsQualifierProperties' ),
			data: data,
			label: label,
			$overlay: this.$overlay
		} );
	};

	/**
	 * Current input, for LookupElement.
	 *
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.getValue = function () {
		return this.$input.val();
	};

	/**
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.setValue = function () {
		/*
		 * noop - EntityLookupElement will set value to the label that was
		 * selected from the autocomplete, but that's not what we want here...
		 * We'll bind to the choose event (which exposes the selected item)
		 * and add a tag for the relevant item.
		 */
	};

	/**
	 * Item selected from LookupElement.
	 *
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.onChoose = function ( item ) {
		var data = item.getData();

		// we're adding an item from LookupElement: clear current input
		this.clearInput();

		this.addItems( [ this.createItemWidget( data.id, data.label ) ] );
	};

	/**
	 * Required for LookupElement...
	 *
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.isReadOnly = function () {
		return false;
	};

	/**
	 * When clearing the input, also remove the lookup menu.
	 *
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.clearInput = function () {
		search.DepictsInputWidget.parent.prototype.clearInput.call( this );
		this.closeLookupMenu();
	};

	/**
	 * When adding items, a 'change' event will be triggered, which will cause the
	 * lookup (autocomplete) menu to be populated. Since we don't want that to
	 * happen (it should only be populated when typing, not when adding an item),
	 * we're going to disable lookups for a bit.
	 *
	 * @inheritdoc
	 */
	search.DepictsInputWidget.prototype.addItems = function ( items ) {
		this.setLookupsDisabled( true );
		search.DepictsInputWidget.parent.prototype.addItems.call( this, items );
		this.setLookupsDisabled( false );
	};

}( mw.mediaInfo.search, mw.mediaInfo.statements ) );
