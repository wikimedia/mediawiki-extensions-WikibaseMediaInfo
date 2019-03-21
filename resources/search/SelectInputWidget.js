( function ( search ) {

	'use strict';

	search.SelectInputWidget = function MediaInfoSearchSelectInputWidget( config ) {
		this.config = config;

		search.SelectInputWidget.parent.call( this, $.extend( {}, config, {
			items: config.options.map( this.optionToItem )
		} ) );

		// create a bogus - empty - dropdown to make this thing look like a dropdown;
		// capture its clicks, and open a floatable window with checkboxes instead
		this.dropdown = new OO.ui.DropdownWidget( $.extend( {}, config, {
			menu: {}
		} ) );
		this.dropdown.$handle.on( {
			click: this.onDropdownClick.bind( this ),
			keydown: this.onDropdownKeyDown.bind( this )
		} );

		// we'll be wrapping some stuff around the checkboxes, so let's move
		// that node out of the way first - we'll be attaching it to the popup
		this.$checkboxesElement = this.$element;
		this.$element = $( '<div>' )
			.addClass( 'oo-ui-widget' )
			.addClass( 'wbmi-search-select-checkboxes-widget' );

		OO.ui.mixin.PopupElement.call( this, $.extend( {}, config, {
			popup: {
				classes: [ 'wbmi-search-select-popup' ],
				anchor: false,
				$floatableContainer: this.dropdown.$element,
				$content: this.$checkboxesElement
			}
		} ) );
		this.$element.append( this.dropdown.$element, this.popup.$element );

		// update dropdown label according to selected checkboxes
		this.connect( this, { change: 'updateLabel' } );
		this.updateLabel();

		// @todo implement support for 'disabled'
	};
	OO.inheritClass( search.SelectInputWidget, search.NestedCheckboxMultiselectWidget );
	OO.mixinClass( search.SelectInputWidget, OO.ui.mixin.PopupElement );

	/**
	 * @param {Object} option
	 * @return {OO.ui.OptionWidget|OO.ui.CheckboxMultioptionWidget}
	 */
	search.SelectInputWidget.prototype.optionToItem = function ( option ) {
		if ( option.optgroup !== undefined ) {
			return new OO.ui.MenuSectionOptionWidget( {
				label: mw.message( option.optgroup ).exists() ?
					mw.message( option.optgroup ).text() :
					option.optgroup
			} );
		} else {
			return new search.NestedCheckboxMultioptionWidget( option );
		}
	};

	/**
	 * Toggle the popup.
	 * This also makes sure the size if set (which, unless configured differently,
	 * falls back to the the size of the element in the popup, or the width of the
	 * dropdown handle - whichever is largest)
	 */
	search.SelectInputWidget.prototype.toggle = function () {
		var width = this.config.popup && this.config.popup.width,
			height = this.config.popup && this.config.popup.height;

		if ( this.popup.isVisible() === false ) {
			this.popup.setSize(
				width || this.dropdown.$element.innerWidth(),
				height
			);
		}

		this.popup.toggle();
	};

	/**
	 * @inheritdoc
	 */
	search.SelectInputWidget.prototype.onDropdownClick = function ( e ) {
		if ( !this.isDisabled() && e.which === OO.ui.MouseButtons.LEFT ) {
			this.toggle();
		}
		return false;
	};

	/**
	 * @inheritdoc
	 */
	search.SelectInputWidget.prototype.onDropdownKeyDown = function ( e ) {
		if (
			!this.isDisabled() &&
			(
				e.which === OO.ui.Keys.ENTER ||
				(
					!this.popup.isVisible() &&
					(
						e.which === OO.ui.Keys.UP ||
						e.which === OO.ui.Keys.DOWN
					)
				)
			)
		) {
			this.toggle();
			return false;
		}
	};

	search.SelectInputWidget.prototype.updateLabel = function () {
		var getLabelsRecursive = function ( result, item ) {
				var children, selectedChildren, childLabels;

				if ( !item.isSelected() ) {
					return result;
				}

				children = item.getItems();
				if ( children.length === 0 ) {
					result.push( item.getLabel() );
					return result;
				}

				// get labels for all selected children, then figure out if
				// that's actually *all* of them
				// we can't use `isSelected`, because a parent node may be
				// selected when only a part of its children are selected...
				childLabels = children.reduce( getLabelsRecursive, [] );
				selectedChildren = children.filter( function ( item ) {
					return childLabels.indexOf( item.getLabel() ) >= 0;
				} );

				if ( selectedChildren.length === children.length ) {
					// if all children were selected, then just add the parent label
					result.push( item.getLabel() );
				} else {
					// if only part of the children were selected, add only those children
					result = result.concat( childLabels );
				}

				return result;
			},
			labels = this.getItems().reduce( getLabelsRecursive, [] );

		this.dropdown.setLabel( mw.language.listToText( labels ) );
	};

}( mw.mediaInfo.search ) );
