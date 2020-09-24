'use strict';

var ComponentWidget = require( 'wikibase.mediainfo.base' ).ComponentWidget,
	ExampleComponentWidget;

/**
 * This is an example ComponentWidget implementation, to show
 * how to use/implement its methods to control the rendering flow.
 *
 * ComponentWidget is a mixin with a very simple API. The purpose
 * of this plugin is to automate template-based rendering by regulating
 * when to automatically rerender: when data changes, but changes are
 * queued/combined to avoid race conditions, and active DOM nodes getting
 * replaced.
 *
 * There are 3 protected methods that any implementation can override
 * to control what happens:
 *
 * - shouldRerender( previousState: Object ): boolean
 *     Called before rerender, can prevent automatic rerender (e.g. when
 *     nothing relevant to output has changed)
 * - getTemplateData(): Promise<Object> | Object
 *     Provides the variables to the template
 * - setState( state: Object ): Promise<jQuery>
 *     Not to be implemented/overwritten by implementations - only meant
 *     to be called with new data (which will then trigger rerender)
 *
 * There is 1 public method:
 *
 * - render()
 *     Can be called both from the inside or outside, to retrieve a promise
 *     that will return the DOM (jQuery nodes) once it has completed rendering
 *
 * @constructor
 * @param {Object} config
 */
ExampleComponentWidget = function ExampleComponentWidgetConstructor( config ) {
	config = config || {};

	ExampleComponentWidget.parent.call( this, config );

	// initialize state - this data will be used for the initial render
	this.state = $.extend( {}, config, {
		editing: false,
		disabled: false,
		title: config.title || 'Main Page'
	} );

	// wire up ComponentWidget, kicking off the initial render
	ComponentWidget.call(
		this,
		// these 2 arguments are the name of the module and the relevant
		// template, as defined in extension.json ResourceModules
		'wikibase.mediainfo.readme',
		'templates/README/1.ExampleComponentWidget.mustache+dom'
	);
};
OO.inheritClass( ExampleComponentWidget, OO.ui.Widget );
OO.mixinClass( ExampleComponentWidget, ComponentWidget );

/**
 * Called after state has been modified, and before rerendering.
 * Return an object to be passed on to the template.
 *
 * @return {Object|jQuery.Promise<Object>}
 */
ExampleComponentWidget.prototype.getTemplateData = function () {
	// this method will be used to feed data to the template
	// it should return a { key: value } map of variables to
	// be parsed into the template

	// if this method is not implemented, it'll default to
	// parsing the entire content of `this.state` into the template
	// i.e.: `return this.state;`

	// but it can be useful to keep `state` minimal, and use this
	// method to derive additional data from the state. E.g.:
	return {
		editing: this.state.editing && !this.state.disabled,
		disabled: this.state.disabled,
		title: new mw.Title( this.state.title ).getNameText(),
		namespace: new mw.Title( this.state.title ).getNamespaceId(),
		images: []
	};

	// or it could return a promise that resolves with such object
	// (useful when e.g. API requests are needed to grab some of the
	// data - careful though, better cache API responses to avoid
	// making the same API call every time we have to rerender)
	/*
	var self = this;
	this.cache = this.cache || {};
	if ( !( this.state.title in this.cache ) ) {
		this.cache[ this.state.title ] = new mw.Api().get( { action: 'query', titles: this.state.title, prop: 'images' } );
	}
	return this.cache[ this.state.title ].then( function ( result ) {
		var result.query.pages[ Object.keys( result.query.pages ).pop() ];
		return {
			editing: self.state.editing && !self.state.disabled,
			disabled: self.state.disabled,
			title: data.title,
			namespace: data.ns,
			images: data.images.map( function ( image ) {
				return image.title;
			} )
		};
	} );
	*/
};

/**
 * Called after state has been modified, and before rerendering.
 * Return false to prevent rerender.
 *
 * Argument previousState can be used to compare again new
 * `this.state` to determine whether a rerender is warranted.
 *
 * @param {Object} previousState
 * @return {Object|jQuery.Promise<Object>}
 */
ExampleComponentWidget.prototype.shouldRerender = function ( previousState ) {
	// this method can be used to tell the rendering pipeline whether
	// or not to go ahead rerendering a change, by returning `true` or `false`

	// this can be used to prevent changes in data from actually
	// rerendering the data when it should or must not do so (possibly
	// because the data is in an incomplete/invalid state and it must
	// not change for some reason)

	// the `previousState` argument is the data that was used in the
	// previous render of the component (i.e. what is currently being
	// displayed)
	// `this.state` is the new data, that'll be used in a new rerender

	// an example, where we may not want to render any updates when the
	// widget is disabled, until it gets re-enabled:
	return previousState.disabled !== true || this.state.disabled !== true;

	// this method does not have to exist, in which case it'll just
	// default to `true`, i.e. rerender whenever state is changed
};

/**
 * This is not a ComponentWidget method that we're overriding, but
 * just a random 'own' example method to demonstrate the use of
 * `this.setState`
 *
 * @param {boolean} editing
 * @return {jQuery.Promise<jQuery>}
 */
ExampleComponentWidget.prototype.setEditing = function ( editing ) {
	// this is just an example method that needs to manipulate some data
	// and update the DOM

	// we can update the internal state of the element with a simple call
	// to `this.setState`, where we provide an object with *only the data
	// that has changed*, and it'll be merged into the existing state:
	var promise = this.setState( { editing: editing } );
	// above will update `this.state` by only overwriting
	// `this.state.editing` - other keys in state will remain untouched

	// if `this.state.editing` has changed, it'll make sure to rerender
	// the DOM to reflect the new changes (unless `shouldRerender` tells
	// it not to)
	// if the new state has not changed, no rerender will happen...

	promise = promise.then( function ( $element ) {
		// `this.setState` returns a promise that doesn't resolve until
		// `render` is complete and the DOM has been updated (or even
		// when it didn't have to rerender, in which case it'll resolve
		// right away with the existing DOM)

		// this is useful to synchronize changes, e.g.
		// - wait until rendering has completed before emitting the relevant events
		// - wait until rendering has completed before checking correct output in unit tests

		// and the setState promise callback argument will always include
		// the post-render DOM node `$element`, which is an up-to-date
		// DOM representation of that new state
		return $element;
	} );

	return promise;
};

module.exports = ExampleComponentWidget;
