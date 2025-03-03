'use strict';

const hooks = require( '../../support/hooks.js' );

QUnit.module( 'ExampleComponentWidget', hooks.mediainfo, () => {
	QUnit.test( 'Edit mode enabled', ( assert ) => {
		const done = assert.async(),
			ExampleComponentWidget = require( '../../../../resources/README/1.ExampleComponentWidget.js' ),
			widget = new ExampleComponentWidget();

		widget.setEditing( true ).then( ( $element ) => {
			const status = $element.find( '.status' ).text();
			assert.strictEqual( status, 'enabled' );
			done();
		} );
	} );

	QUnit.test( 'Edit mode disabled', ( assert ) => {
		const done = assert.async(),
			ExampleComponentWidget = require( '../../../../resources/README/1.ExampleComponentWidget.js' ),
			widget = new ExampleComponentWidget();

		widget.setEditing( false ).then( ( $element ) => {
			const status = $element.find( '.status' ).text();
			assert.strictEqual( status, 'disabled' );
			done();
		} );
	} );
} );
