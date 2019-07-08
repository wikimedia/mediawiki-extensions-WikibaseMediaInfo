'use strict';

/**
 * A wrapper around OO.ui.mixin.GroupElement, to provide the exact
 * same functionality, except for the parts that move DOM elements.
 *
 * @inheritDoc
 */
var DOMLessGroupWidget = function ( config ) {
	OO.ui.mixin.GroupWidget.call( this, config );
};
OO.mixinClass( DOMLessGroupWidget, OO.ui.mixin.GroupWidget );

/**
 * Override parent method, which moves DOM nodes around: we don't
 * want that to happen because we're not using this.$group, we
 * render nodes via templates, and if they were to be appended to
 * this.$group, they'd get detached from the template-rendered
 * version...
 *
 * @inheritDoc
 */
DOMLessGroupWidget.prototype.setGroupElement = function ( $group ) {
	this.$group = $group;
};

/**
 * Override parent method, which moves DOM nodes around: we don't
 * want that to happen because we're not using this.$group, we
 * render nodes via templates, and if they were to be appended to
 * this.$group, they'd get detached from the template-rendered
 * version...
 *
 * @inheritDoc
 */
DOMLessGroupWidget.prototype.insertItemElements = function () {
	// nothing here - don't move nodes around!
};

module.exports = DOMLessGroupWidget;
