'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	TemplatingFeatures;

/**
 * This builds on the ExampleComponentWidget to show some of the
 * things that can be done with mustache+dom templates.
 *
 * Templates ending in `mustache+dom` extension will use the
 * `mustache+dom` template parser, which is basically standard
 * mustache templates (https://mustache.github.io/) with some
 * additions:
 * - the ability to parse OOUI widgets, jQuery nodes or HTMLElement
 *   objects into the template
 * - the ability to parse functions as event handlers into the template
 *
 * @constructor
 * @param {Object} config
 */
TemplatingFeatures = function TemplatingFeaturesConstructor( config ) {
	config = config || {};

	TemplatingFeatures.parent.call( this, config );

	this.state = $.extend( {}, config, {
		editing: false,
		input: new OO.ui.TextInputWidget( { classes: [ 'example-input' ] } )
	} );

	ComponentWidget.call(
		this,
		'wikibase.mediainfo.readme',
		'templates/README/2.TemplatingFeatures.mustache+dom'
	);
};
OO.inheritClass( TemplatingFeatures, OO.ui.Widget );
OO.mixinClass( TemplatingFeatures, ComponentWidget );

/**
 * @inheritDoc
 */
TemplatingFeatures.prototype.getTemplateData = function () {
	return {
		editing: this.state.editing,

		// functions can be assigned to the template, and used as
		// callbacks to `on*` attributes
		toggleEdit: this.toggleEdit.bind( this ),

		// OOUI elements (or jQuery/HTMLElement nodes) can also be
		// parsed into the template, just be sure to unescape them
		// (via triple brackets `{{{var}}}`)
		button: new OO.ui.ButtonWidget( { classes: [ 'example-button' ] } ),
		// there is a difference in how new elements (like the above
		// button that just got created anew) and existing elements
		// (like the below input, that is the same objects every
		// time we render) get treated:
		// - 'input' (the existing node) will always be preserved,
		//   it'll be carried over for every rerender
		// - 'button' (the new node) will replace an existing node
		//   (even if it does the exact same thing, like this same
		//   button in a previous render)
		// this basically means that nodes whose state you'll want
		// to carry over to other parts of the code (e.g. fetch
		// their value) must not be recreated on rerenders, but
		// should be passed around (i.e. like `input` here)
		// nodes that are purely presentational, or trigger other
		// effects (e.g. event callbacks) can be new (i.e. 'button')
		input: this.state.input
	};
};

/**
 * @param {Event} e
 * @return {jQuery.Promise<jQuery>}
 */
TemplatingFeatures.prototype.toggleEdit = function ( e ) {
	e.preventDefault();
	return this.setState( { editing: !this.state.editing } );
};

module.exports = TemplatingFeatures;
