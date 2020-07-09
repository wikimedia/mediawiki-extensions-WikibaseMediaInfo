'use strict';

const sinon = require( 'sinon' ),
	hooks = require( '../support/hooks.js' );
let sandbox;

QUnit.module( 'mediainfo.template.mustache+dom', Object.assign( {}, hooks.mediawiki, {
	beforeEach: function () {
		hooks.mediawiki.beforeEach();

		sandbox = sinon.createSandbox();
		sandbox.stub( mw.templates, 'get' ).returns( {
			'test.mustache+dom': '<div>{{{foo}}}</div>'
		} );
	},
	afterEach: function () {
		sandbox.restore();
		hooks.mediainfo.afterEach();
	}
} ), function () {
	QUnit.test( 'Render mustache templates', function ( assert ) {
		const template = mw.template.get( 'stub', 'test.mustache+dom' );

		const data = {
			foo: 'Hello world'
		};

		const html = template.render( data ).html();

		assert.strictEqual( html, 'Hello world', 'Rendered mustache template' );
	} );

	QUnit.module( 'Mustache templates with HTMLElement', {}, function () {
		QUnit.test( 'Nodes are parsed into template', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				node = document.createElement( 'div' );

			node.id = 'test';
			node.innerHTML = 'Hello world';

			const $result = template.render( { foo: node } );

			assert.strictEqual( $result.find( '#test' ).length, 1, 'Node is rendered' );
			assert.strictEqual( $result.find( '#test' ).text(), 'Hello world', 'Node contains content' );
		} );

		QUnit.test( 'Events triggered from template-based HTML propagate to original element handlers', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				onClick = sinon.stub(),
				node = document.createElement( 'div' );

			node.id = 'test';
			node.innerHTML = 'Hello world';
			node.onclick = onClick;

			const $result = template.render( { foo: node } );

			assert.strictEqual( onClick.callCount, 0, 'Event not yet triggered' );
			$result.find( '#test' ).trigger( 'click' );
			assert.strictEqual( onClick.callCount, 1, 'Event triggered' );
		} );

		QUnit.test( 'Changes to node later on propagate into DOM rendered by template', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				node = document.createElement( 'div' );

			node.id = 'test';
			node.innerHTML = 'Hello world';

			const $result = template.render( { foo: node } );

			assert.strictEqual( $result.find( '#test-updated' ).length, 0, 'Element in DOM not yet altered' );
			node.id = 'test-updated';
			assert.strictEqual( $result.find( '#test-updated' ).length, 1, 'Element in DOM altered' );
		} );
	} );

	QUnit.module( 'Mustache templates with jQuery nodes', {}, function () {
		QUnit.test( 'Nodes are parsed into template', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				$node = $( '<div>' )
					.attr( 'id', 'test' )
					.text( 'Hello world' );

			const $result = template.render( { foo: $node } );

			assert.strictEqual( $result.find( '#test' ).length, 1, 'Node is rendered' );
			assert.strictEqual( $result.find( '#test' ).text(), 'Hello world', 'Node contains content' );
		} );

		QUnit.test( 'Events triggered from template-based HTML propagate to original element handlers', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				onClick = sinon.stub(),
				$node = $( '<div>' )
					.attr( 'id', 'test' )
					.text( 'Hello world' )
					.on( 'click', onClick );

			const $result = template.render( { foo: $node } );

			assert.strictEqual( onClick.callCount, 0, 'Event not yet triggered' );
			$result.find( '#test' ).trigger( 'click' );
			assert.strictEqual( onClick.callCount, 1, 'Event triggered' );
		} );

		QUnit.test( 'Changes to node later on propagate into DOM rendered by template', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				$node = $( '<div>' )
					.attr( 'id', 'test' )
					.text( 'Hello world' );

			const $result = template.render( { foo: $node } );

			assert.strictEqual( $result.find( '#test-updated' ).length, 0, 'Element in DOM not yet altered' );
			$node.attr( 'id', 'test-updated' );
			assert.strictEqual( $result.find( '#test-updated' ).length, 1, 'Element in DOM altered' );
		} );
	} );

	QUnit.module( 'Mustache templates with OOUI widgets', {}, function () {
		QUnit.test( 'Nodes are parsed into template', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				widget = new OO.ui.Widget( {
					id: 'test',
					text: 'Hello world'
				} );

			const $result = template.render( { foo: widget } );

			assert.strictEqual( $result.find( '#test' ).length, 1, 'Node is rendered' );
			assert.strictEqual( $result.find( '#test' ).text(), 'Hello world', 'Node contains content' );
		} );

		QUnit.test( 'Events triggered from template-based HTML propagate to original element handlers', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				onClick = sinon.stub(),
				widget = new OO.ui.Widget( {
					id: 'test',
					text: 'Hello world'
				} );

			// wire up widget to emit an OOUI event by something triggered in DOM
			widget.$element.on( 'click', widget.emit.bind( widget, 'click' ) );
			widget.on( 'click', onClick );

			const $result = template.render( { foo: widget } );

			assert.strictEqual( onClick.callCount, 0, 'Event not yet triggered' );
			$result.find( '#test' ).trigger( 'click' );
			assert.strictEqual( onClick.callCount, 1, 'Event triggered' );
		} );

		QUnit.test( 'Changes to node later on propagate into DOM rendered by template', function ( assert ) {
			const template = mw.template.get( 'stub', 'test.mustache+dom' ),
				widget = new OO.ui.Widget( {
					id: 'test',
					text: 'Hello world'
				} );

			const $result = template.render( { foo: widget } );

			assert.strictEqual( $result.find( '#test-updated' ).length, 0, 'Element in DOM not yet altered' );
			widget.setElementId( 'test-updated' );
			assert.strictEqual( $result.find( '#test-updated' ).length, 1, 'Element in DOM altered' );
		} );
	} );
} );
