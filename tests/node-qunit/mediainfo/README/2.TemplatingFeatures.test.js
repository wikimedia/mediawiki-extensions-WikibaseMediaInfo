'use strict';

const sinon = require( 'sinon' ),
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'TemplatingFeatures', hooks.mediainfo, () => {
	QUnit.test( 'Toggle edit mode', ( assert ) => {
		const done = assert.async(),
			TemplatingFeatures = require( '../../../../resources/README/2.TemplatingFeatures.js' ),
			widget = new TemplatingFeatures();

		widget.render()
			.then( ( $element ) => {
				// default: not editing
				assert.strictEqual( $element.find( '.example-input' ).length, 0 );
				assert.strictEqual( $element.find( '.example-button' ).length, 0 );
			} )
			.then( widget.toggleEdit.bind( widget, { preventDefault: sinon.stub() } ) )
			.then( ( $element ) => {
				// editing: input & button are displayed
				assert.strictEqual( $element.find( '.example-input' ).length, 1 );
				assert.strictEqual( $element.find( '.example-button' ).length, 1 );
			} )
			.then( widget.toggleEdit.bind( widget, { preventDefault: sinon.stub() } ) )
			.then( ( $element ) => {
				// we're no longer editing
				assert.strictEqual( $element.find( '.example-input' ).length, 0 );
				assert.strictEqual( $element.find( '.example-button' ).length, 0 );
				done();
			} );
	} );
} );
