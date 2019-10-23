'use strict';

var QuantityInputWidget;

/**
 * @constructor
 * @param {Object} config
 */
QuantityInputWidget = function ( config ) {
	this.config = $.extend( {}, config );
	QuantityInputWidget.parent.call( this, this.config );
	this.connect( this, { enter: 'onEnter' } );
};

OO.inheritClass( QuantityInputWidget, OO.ui.NumberInputWidget );

QuantityInputWidget.prototype.onEnter = function () {
	this.emit( 'addItem', this.value );
};

module.exports = QuantityInputWidget;
