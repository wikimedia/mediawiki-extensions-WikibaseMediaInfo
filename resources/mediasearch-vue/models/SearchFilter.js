'use strict';

/**
 * Search Filter object.
 *
 * @param {string} type Filter type key
 * @param {Array} items Item objects (with label and value properties)
 */
var WbmiSearchFilter = function (
	type,
	items
) {
	this.type = type;
	this.items = this.getProcessedItems( items );
};

WbmiSearchFilter.prototype.getProcessedItems = function ( items ) {
	var processedItems = [];

	items.forEach( function ( item ) {
		processedItems.push( {
			// eslint-disable-next-line mediawiki/msg-doc
			label: mw.msg( item.label ),
			value: item.value
		} );
	} );

	return processedItems;
};

module.exports = WbmiSearchFilter;
