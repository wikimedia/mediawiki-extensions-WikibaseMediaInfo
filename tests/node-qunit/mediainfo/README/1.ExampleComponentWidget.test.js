'use strict';

const hooks = require( '../../support/hooks.js' );

QUnit.module( 'ExampleComponentWidget', hooks.mediainfo, function () {
	QUnit.test( 'Edit mode enabled', function ( assert ) {
		const done = assert.async(),
			ExampleComponentWidget = require( '../../../../resources/README/1.ExampleComponentWidget.js' ),
			widget = new ExampleComponentWidget();

		widget.setEditing( true ).then( function ( $element ) {
			const status = $element.find( '.status' ).text();
			assert.strictEqual( status, 'enabled' );
			done();
		} );
	} );

	QUnit.test( 'Edit mode disabled', function ( assert ) {
		const done = assert.async(),
			ExampleComponentWidget = require( '../../../../resources/README/1.ExampleComponentWidget.js' ),
			widget = new ExampleComponentWidget();

		widget.setEditing( false ).then( function ( $element ) {
			const status = $element.find( '.status' ).text();
			assert.strictEqual( status, 'disabled' );
			done();
		} );
	} );
} );
