'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/EntityInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'EntityInputWidget', hooks.mediainfo, () => {
	QUnit.test( 'Valid data roundtrip', ( assert ) => {
		const done = assert.async(),
			EntityInputWidget = require( pathToWidget ),
			widget = new EntityInputWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.EntityId( 'Q1' );

		widget.setData( data ).then( () => {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', ( assert ) => {
		const done = assert.async(),
			EntityInputWidget = require( pathToWidget ),
			widget = new EntityInputWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.EntityId( 'Q1' ),
			newData = new datamodel.EntityId( 'Q2' ),
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
			EntityInputWidget = require( pathToWidget ),
			widget = new EntityInputWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.EntityId( 'Q1' ),
			sameData = new datamodel.EntityId( 'Q1' ),
			onChange = sinon.stub();

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( () => {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );
} );
