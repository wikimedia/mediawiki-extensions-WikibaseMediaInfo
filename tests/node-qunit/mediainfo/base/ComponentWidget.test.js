'use strict';

const sinon = require( 'sinon' ),
	hooks = require( '../../support/hooks.js' );
let ComponentWidget,
	ExampleComponentWidget,
	sandbox;

QUnit.module( 'ComponentWidget', Object.assign( {}, hooks.mediainfo, {
	beforeEach: function () {
		hooks.mediainfo.beforeEach();

		sandbox = sinon.createSandbox();
		sandbox.stub( mw.templates, 'get' ).returns( {
			'ExampleComponentWidget.mustache+dom': '<div>{{variable}}</div>'
		} );

		ComponentWidget = require( '../../../../resources/base/ComponentWidget.js' );
		ExampleComponentWidget = function ( config ) {
			config = config || {};

			this.state = {
				variable: config.variable || 'foo'
			};

			ExampleComponentWidget.parent.call( this, config );
			ComponentWidget.call(
				this,
				'module-not-required-because-stubbed-out',
				'ExampleComponentWidget.mustache+dom'
			);
		};
		OO.inheritClass( ExampleComponentWidget, OO.ui.Widget );
		OO.mixinClass( ExampleComponentWidget, ComponentWidget );
	},
	afterEach: function () {
		sandbox.restore();
		hooks.mediainfo.afterEach();
	}
} ), function () {
	QUnit.test( 'Widget renders with default state', function ( assert ) {
		const done = assert.async(),
			widget = new ExampleComponentWidget( { variable: 'foo' } );

		widget.render().then( function ( $element ) {
			assert.strictEqual( $element.text(), 'foo' );
			done();
		} );
	} );

	QUnit.test( 'Widget rerenders with new state', function ( assert ) {
		const done = assert.async(),
			widget = new ExampleComponentWidget( { variable: 'foo' } );

		widget.setState( { variable: 'bar' } ).then( function ( $element ) {
			assert.strictEqual( $element.text(), 'bar' );
			done();
		} );
	} );

	QUnit.test( 'Widget renders with changed template data', function ( assert ) {
		const done = assert.async(),
			widget = new ExampleComponentWidget( { variable: 'foo' } );

		// override getTemplateData method to change the params that'll
		// be fed to the template
		widget.getTemplateData = function () {
			return { variable: 'changed' };
		};

		widget.setState( { variable: 'bar' } ).then( function ( $element ) {
			assert.strictEqual( $element.text(), 'changed' );
			done();
		} );
	} );

	QUnit.test( 'Widget renders with async changed template data', function ( assert ) {
		const done = assert.async(),
			widget = new ExampleComponentWidget( { variable: 'foo' } );

		// override getTemplateData method to change the params that'll
		// be fed to the template - that will be a promise that
		// doesn't resolve immediately, to simulate e.g. an API call
		widget.getTemplateData = function () {
			const deferred = $.Deferred();
			setTimeout( deferred.resolve.bind( deferred, { variable: 'changed async' } ), 10 );
			return deferred.promise();
		};

		widget.setState( { variable: 'bar' } ).then( function ( $element ) {
			assert.strictEqual( $element.text(), 'changed async' );
			done();
		} );
	} );

	QUnit.test( 'Widget will not rerender on state change if stopped', function ( assert ) {
		const done = assert.async(),
			widget = new ExampleComponentWidget( { variable: 'foo' } );

		// override shouldRerender method to instruct component not to rerender
		widget.shouldRerender = function () {
			return false;
		};

		widget.setState( { variable: 'bar' } ).then( function ( $element ) {
			assert.strictEqual( $element.text(), 'foo' );
			done();
		} );
	} );

	QUnit.test( 'Widget will only rerender once when multiple state changes happen during previous render', function ( assert ) {
		const done = assert.async(),
			widget = new ExampleComponentWidget( { variable: 'foo' } );

		// override getTemplateData method to delay the rendering
		widget.getTemplateData = function () {
			const deferred = $.Deferred();
			setTimeout( deferred.resolve.bind( deferred, this.state ), 100 );
			return deferred.promise();
		};

		// let's wait for in-flight initial render to have completed
		widget.render().then( function () {
			// render with 'foo' - this should render 'foo' just fine (but it'll
			// take a little since we deferred the template data manipulation)
			widget.setState( { variable: 'foo' } ).then( function ( $element ) {
				// since it'll take some time for the initial render to finish
				assert.strictEqual( $element.text(), 'foo' );
			} );

			// wrap next calls inside setTimout to make sure they're executed
			// while the previous render is ongoing
			setTimeout( function () {
				// set new value
				widget.setState( { variable: 'bar' } ).then( function ( $element ) {
					// since it'll take some time for the first render to finish, this
					// value will already have been overwritten before we get around
					// to rendering again, and it'll be combined/optimized away
					assert.strictEqual( $element.text(), 'baz' );
				} );

				// set another new value - this should be the one that actually gets rendered
				widget.setState( { variable: 'baz' } ).then( function ( $element ) {
					// since it'll take some time for the initial render to finish
					assert.strictEqual( $element.text(), 'baz' );
					done();
				} );
			}, 50 );
		} );
	} );
} );
