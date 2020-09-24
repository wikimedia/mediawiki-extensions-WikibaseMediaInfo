'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	BestPractices;

/**
 * This builds on the ExampleComponentWidget & TemplatingFetaures
 * to show some of the current working best practices in MediaInfo.
 *
 * As of writing these examples, not all MediaInfo code has been
 * refactored to match these best practices, and we may come up
 * with more formal best practices, or adjust some of what is
 * described in these examples, in which case I hope we update
 * these to remain relevant :)
 *
 * @constructor
 * @param {Object} config
 */
BestPractices = function BestPracticesConstructor( config ) {
	config = config || {};

	BestPractices.parent.call( this, config );

	this.state = $.extend( {}, config, {
		some: '',
		relevant: 0,
		data: {}
	} );

	ComponentWidget.call(
		this,
		'wikibase.mediainfo.readme',
		'templates/README/3.BestPractices.mustache+dom'
	);
};
OO.inheritClass( BestPractices, OO.ui.Widget );
OO.mixinClass( BestPractices, ComponentWidget );

/**
 * This method returns a complete and accurate description of the state
 * of this element.
 *
 * This data could be used to construct a new copy of this object.
 *
 * @return {*}
 */
BestPractices.prototype.getData = function () {
	// this could be returned in any format, as long as `setData` accepts
	// that same format and is able to convert it to state
	return {
		some: this.state.some,
		relevant: this.state.relevant,
		data: this.state.data
	};
};

/**
 * This method accepts data to completely alter all state of this component.
 *
 * It must accept the data in the same format as `getData()` would return it.
 *
 * It must return a promise that resolves with the new DOM, after the
 * component has rerendered with the new data.
 *
 * After completing the rerender, it also throws an event if (and only if)
 * the new data was different than the previous data.
 *
 * @param {*} data
 * @return {jQuery.Promise<jQuery>}
 */
BestPractices.prototype.setData = function ( data ) {
	var self = this,
		// some way of determining whether or not the new data is different than
		// the current state of the component
		// this could be implemented in any way that makes sense
		hasChanges = JSON.stringify( this.getData() ) !== JSON.stringify( data );

	return this.setState( {
		some: data.some,
		relevant: data.relevant,
		data: data.data
	} ).then( function ( $element ) {
		if ( hasChanges ) {
			self.emit( 'change' );
		}
		return $element;
	} );
};

module.exports = BestPractices;
