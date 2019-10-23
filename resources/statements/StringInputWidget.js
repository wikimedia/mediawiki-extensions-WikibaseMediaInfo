'use strict';

var StringInputWidget;

/**
 * @constructor
 * @param {Object} config
 */
StringInputWidget = function ( config ) {
	this.config = $.extend( {}, config );
	StringInputWidget.parent.call( this, this.config );
	this.connect( this, { enter: 'onEnter' } );
};

OO.inheritClass( StringInputWidget, OO.ui.TextInputWidget );

StringInputWidget.prototype.onEnter = function () {
	this.emit( 'addItem', this.value );
};

module.exports = StringInputWidget;
