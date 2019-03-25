( function ( search ) {

	'use strict';

	search.QualifiersPopoverWidget = function MediaInfoSearchQualifiersPopoverWidget( config ) {
		search.QualifiersPopoverWidget.parent.call( this, config );

		this.savedValues = [];

		config = config || {};

		this.terms = config.terms;
		this.properties = config.properties;

		this.addButton = new OO.ui.ButtonWidget( {
			label: config.messages.add || '',
			framed: false,
			flags: [ 'progressive' ],
			icon: 'add'
		} );
		this.addButton.connect( this, { click: 'addQualifier' } );

		this.cancelButton = new OO.ui.ButtonWidget( {
			label: config.messages.cancel || '',
			framed: false
		} );
		this.cancelButton.connect( this, { click: 'reset' } );
		this.cancelButton.connect( this, { click: [ 'emit', 'cancel' ] } );

		this.saveButton = new OO.ui.ButtonWidget( {
			label: config.messages.save || '',
			flags: [ 'primary', 'progressive' ]
		} );
		this.saveButton.connect( this, { click: 'save' } );
		this.saveButton.connect( this, { click: [ 'emit', 'save' ] } );

		this.qualifiersLayout = new OO.ui.FieldsetLayout();

		this.fieldset = new OO.ui.FieldsetLayout( {
			label: config.messages.title || ''
		} );
		this.fieldset.addItems( [
			new OO.ui.FieldsetLayout( {
				label: config.messages.intro || '',
				classes: [ 'wbmi-search-qualifier-intro' ]
			} ),
			this.qualifiersLayout,
			new OO.ui.HorizontalLayout( {
				classes: [ 'wbmi-search-qualifier-controls' ],
				items: [ this.addButton ] }
			),
			new OO.ui.HorizontalLayout( {
				classes: [ 'wbmi-search-popover-controls' ],
				items: [ this.cancelButton, this.saveButton ] }
			)
		] );

		// add an empty qualifier to start with
		this.addQualifier();

		this.$element = $( '<div>' )
			.addClass( 'wbmi-search-qualifiers' )
			.append( this.fieldset.$element );
	};
	OO.inheritClass( search.QualifiersPopoverWidget, OO.ui.Widget );

	/**
	 * @inheritdoc
	 */
	search.QualifiersPopoverWidget.prototype.getTerm = function () {
		// fetching the term while the qualifiers popover is active/open
		// is terribly confusing: does the term reflect the saved qualifiers,
		// or does it reflect the unsaved, still open, qualifiers?
		// to avoid this confusion, we're going to reset the qualifiers to
		// whatever was saved
		this.reset();

		return this.qualifiersLayout.getItems()
			.map( function ( item ) {
				return item.getTerm();
			} )
			.filter( function ( term ) {
				// clear out empty qualifiers
				return term !== '';
			} )
			.filter( function ( value, i, self ) {
				// remove duplicates
				return self.indexOf( value ) === i;
			} )
			.join( ' ' );
	};

	/**
	 * @param {Object} [data]
	 */
	search.QualifiersPopoverWidget.prototype.addQualifier = function ( data ) {
		var widget = new search.QualifierWidget( { terms: this.terms, properties: this.properties } );
		widget.setData( data || {} );
		widget.connect( this.qualifiersLayout, { remove: [ 'removeItems', [ widget ] ] } );

		this.qualifiersLayout.addItems( [ widget ] );
	};

	search.QualifiersPopoverWidget.prototype.save = function () {
		var self = this;

		this.savedValues = [];

		// iterate all qualifiers and store their values, so that when one
		// comes back to change things but then cancel, we can restore the
		// previously saved values
		this.qualifiersLayout.getItems().forEach( function ( qualifiersWidget ) {
			self.savedValues.push( qualifiersWidget.getData() );
		} );
	};

	search.QualifiersPopoverWidget.prototype.reset = function () {
		var self = this;

		// remove existing items & re-add previously entered data
		this.qualifiersLayout.clearItems();
		if ( this.savedValues.length > 0 ) {
			this.savedValues.forEach( function ( data ) {
				self.addQualifier( data );
			} );
		} else {
			// or add a stub item if there was no existing data
			self.addQualifier();
		}
	};

}( mw.mediaInfo.search ) );
