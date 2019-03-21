( function ( search ) {

	'use strict';

	search.NestedCheckboxMultioptionWidget = function
	MediaInfoSearchNestedCheckboxMultioptionWidget( config ) {
		// parse labels as messages
		config = $.extend( {}, config );
		if ( config.label && mw.message( config.label ).exists() ) {
			config.label = mw.message( config.label ).text();
		}
		search.NestedCheckboxMultioptionWidget.parent.call( this, config );

		// wrap another element around the default checkbox label,
		// so that clicks on child elements don't automatically propagate
		// to the parent (where it would otherwise be part of)
		this.$element = $( '<div>' ).addClass( 'wbmi-search-nested-multioption-group' ).append( this.$element );

		OO.ui.mixin.GroupElement.call( this, $.extend( {}, config, { $group: this.$element } ) );

		// (de)selecting the parent will trigger changes in the children, and
		// vice versa - let's use these properties to make sure don't keep
		// propagating changes back and forth
		this.stopPropagation = false;

		// add child checkboxes, if there are any
		if ( config.options !== undefined ) {
			this.addItems( config.options.map( this.createChild.bind( this ) ) );

			// make sure parent status reflects the initial state of its children
			this.onChildChange();

			// and make sure that clicks on parent get propagated to their children
			this.connect( this, { change: 'onChange' } );
		}
	};
	OO.inheritClass( search.NestedCheckboxMultioptionWidget, OO.ui.CheckboxMultioptionWidget );
	OO.mixinClass( search.NestedCheckboxMultioptionWidget, OO.ui.mixin.GroupElement );

	/**
	 * @param {Object} option
	 * @return {search.NestedCheckboxMultioptionWidget}
	 */
	search.NestedCheckboxMultioptionWidget.prototype.createChild = function ( option ) {
		var child = new this.constructor( option );
		child.connect( this, { change: 'onChildChange' } );
		return child;
	};

	/**
	 * @inheritdoc
	 */
	search.NestedCheckboxMultioptionWidget.prototype.onCheckboxChange = function () {
		this.setSelected( this.checkbox.isSelected(), !this.checkbox.isSelected() );
	};

	/**
	 * @inheritdoc
	 */
	search.NestedCheckboxMultioptionWidget.prototype.isSelected = function () {
		return this.selected;
	};

	/**
	 * pretty much the inverse of isSelected, but different from !isSelected
	 * for checkboxes that have children: if some of the children are selected,
	 * and some are not, a checkbox can be both selected and unselected.
	 *
	 * @return {boolean}
	 */
	search.NestedCheckboxMultioptionWidget.prototype.isUnselected = function () {
		return this.unselected;
	};

	/**
	 * @inheritdoc
	 */
	search.NestedCheckboxMultioptionWidget.prototype.setSelected = function (
		selected, unselected
	) {
		selected = !!selected;
		unselected = !!unselected;

		if ( this.selected !== selected || this.unselected !== unselected ) {
			this.selected = selected;
			this.unselected = unselected;
			this.emit( 'change', selected, unselected );
			this.$element.toggleClass( 'oo-ui-multioptionWidget-selected', selected );
		}

		this.checkbox.setSelected( selected );
		if ( unselected === true ) {
			this.checkbox.checkIcon.setIcon( 'subtract' );
		} else {
			this.checkbox.checkIcon.setIcon( 'check' );
		}

		return this;
	};

	/**
	 * Callback when parent checkbox is changed, to propagate the change
	 * to all its children.
	 *
	 * @param {boolean} selected
	 */
	search.NestedCheckboxMultioptionWidget.prototype.onChange = function ( selected ) {
		if ( this.stopPropagation ) {
			return;
		}

		this.getItems().map( function ( child ) {
			child.setSelected( selected );
		} );
	};

	/**
	 * Callback when one of the child checkboxes is changed, to update
	 * parent in response to the change in its children.
	 */
	search.NestedCheckboxMultioptionWidget.prototype.onChildChange = function () {
		var selected = false,
			unselected = false;

		this.getItems().map( function ( child ) {
			selected = selected || child.isSelected();
			unselected = unselected || child.isUnselected();
		} );

		this.stopPropagation = true;
		this.setSelected( selected, unselected );
		this.emit( 'change' );
		this.stopPropagation = false;
	};

}( mw.mediaInfo.search ) );
