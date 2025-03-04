'use strict';

const sinon = require( 'sinon' ),
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'BestPractices', hooks.mediainfo, () => {
	QUnit.test( 'Valid data roundtrip', ( assert ) => {
		const done = assert.async(),
			BestPractices = require( '../../../../resources/README/3.BestPractices.js' ),
			widget = new BestPractices(),
			data = { some: 'some', relevant: 1, data: { test: 'example' } };

		widget.setData( data ).then( () => {
			assert.ok( widget.getData() );
			assert.strictEqual( JSON.stringify( widget.getData() ), JSON.stringify( data ) );
			done();
		} );
	} );
} );

QUnit.test( 'Setting other data triggers a change event', ( assert ) => {
	const done = assert.async(),
		BestPractices = require( '../../../../resources/README/3.BestPractices.js' ),
		widget = new BestPractices(),
		data = { some: 'some', relevant: 1, data: { test: 'example' } },
		newData = { some: 'other', relevant: 0, data: { test: 'example' } },
		onChange = sinon.stub();

	widget.setData( data )
		.then( widget.on.bind( widget, 'change', onChange, [] ) )
		.then( widget.setData.bind( widget, newData ) )
		.then( () => {
			assert.strictEqual( onChange.called, true );
			done();
		} );
} );

QUnit.test( 'Setting same data does not trigger a change event', ( assert ) => {
	const done = assert.async(),
		BestPractices = require( '../../../../resources/README/3.BestPractices.js' ),
		widget = new BestPractices(),
		data = { some: 'some', relevant: 1, data: { test: 'example' } },
		sameData = { some: 'some', relevant: 1, data: { test: 'example' } },
		onChange = sinon.stub();

	widget.setData( data )
		.then( widget.on.bind( widget, 'change', onChange, [] ) )
		.then( widget.setData.bind( widget, sameData ) )
		.then( () => {
			assert.strictEqual( onChange.called, false );
			done();
		} );
} );
