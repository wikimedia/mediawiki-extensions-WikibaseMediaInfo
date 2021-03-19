'use strict';

/**
 * Search Filter object.
 *
 * @param {string} type Filter type key
 * @param {Array} items Item objects (with label and value properties)
 * @param {Object} data Additional data needed for a filter
 */
var WbmiSearchFilter = function (
	type,
	items,
	data
) {
	this.type = type;
	this.items = items;
	this.data = data || {};
};

module.exports = WbmiSearchFilter;
