( function ( search ) {

	'use strict';

	search.NestedCheckboxMultiselectWidget = function
	MediaInfoSearchNestedCheckboxMultiselectWidget( config ) {
		search.NestedCheckboxMultiselectWidget.parent.call( this, config );
	};
	OO.inheritClass( search.NestedCheckboxMultiselectWidget, OO.ui.CheckboxMultiselectWidget );

	/**
	 * @inheritdoc
	 */
	search.NestedCheckboxMultiselectWidget.prototype.findSelectedItems = function () {
		return this.iterateRecursively( this.getItems(), function ( item ) {
			return item.isSelected();
		} );
	};

	/**
	 * @inheritdoc
	 */
	search.NestedCheckboxMultiselectWidget.prototype.findItemFromData = function ( data ) {
		// @todo could be optimized by not using findItemsFromData (which iterates all items), but
		// return at first match
		var items = this.findItemsFromData( data );
		return items !== null ? items[ 0 ] : null;
	};

	/**
	 * @inheritdoc
	 */
	search.NestedCheckboxMultiselectWidget.prototype.findItemsFromData = function ( data ) {
		var hash = OO.getHash( data ),
			items = this.iterateRecursively( this.getItems(), function ( item ) {
				return OO.getHash( item.getData() ) === hash;
			} );

		return items.length > 0 ? items : null;
	};

	/**
	 * @inheritdoc
	 */
	search.NestedCheckboxMultiselectWidget.prototype.selectItems = function ( items ) {
		var all = this.iterateRecursively(
			this.getItems(),
			function () {
				return true;
			}
		);

		all.forEach( function ( item ) {
			var selected = items.indexOf( item ) >= 0;
			item.setSelected( selected );
		} );

		return this;
	};

	/**
	 * @private
	 * @param {search.NestedCheckboxMultioptionWidget[]} items
	 * @param {Function} callable
	 * @return {search.NestedCheckboxMultioptionWidget[]}
	 */
	search.NestedCheckboxMultiselectWidget.prototype.iterateRecursively = function (
		items, callable
	) {
		var self = this,
			results = [];

		items.forEach( function ( item ) {
			var children = item.getItems();
			if ( children.length !== 0 ) {
				// if this is a parent node, it will not be included in the results,
				// but we'll iterate its children
				results = results.concat( self.iterateRecursively( children, callable ) );
			} else {
				// apply callback - if true is returned, the item will be included
				if ( callable( item ) === true ) {
					results.push( item );
				}
			}
		} );

		return results;
	};

}( mw.mediaInfo.search ) );
