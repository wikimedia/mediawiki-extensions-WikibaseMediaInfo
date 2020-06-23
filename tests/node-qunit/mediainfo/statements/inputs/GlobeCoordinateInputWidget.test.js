'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/GlobeCoordinateInputWidget.js',
	hooks = require( '../../../support/hooks.js' ),
	fakeCoordinates = require( '../../../support/fixtures/data/coordinateData.js' );

QUnit.module( 'GlobeCoordinateInputWidget', hooks.kartographer, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		const done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
			apiStub = global.wikibase.api.getLocationAgnosticMwApi(),
			data = dataValues.GlobeCoordinateValue.newFromJSON( {
				latitude: 0,
				longitude: 0,
				precision: 1
			} );

		// Fake the parsevalue API response
		apiStub.get.returns(
			$.Deferred().resolve( fakeCoordinates.first ).promise()
		);

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		const done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
			apiStub = global.wikibase.api.getLocationAgnosticMwApi(),
			data = dataValues.GlobeCoordinateValue.newFromJSON( {
				latitude: 0,
				longitude: 0,
				precision: 1
			} ),
			newData = dataValues.GlobeCoordinateValue.newFromJSON( {
				latitude: 1,
				longitude: 0,
				precision: 1
			} ),
			onChange = sinon.stub();

		// Fake the parsevalue API response
		apiStub.get.onFirstCall().returns(
			$.Deferred().resolve( fakeCoordinates.first ).promise()
		);

		apiStub.get.onSecondCall().returns(
			$.Deferred().resolve( fakeCoordinates.second ).promise()
		);

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, newData ) )
			.then( function () {
				assert.strictEqual( onChange.called, true );
				done();
			} );
	} );

	QUnit.test( 'Setting same data does not trigger a change event', function ( assert ) {
		const done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
			apiStub = global.wikibase.api.getLocationAgnosticMwApi(),
			data = dataValues.GlobeCoordinateValue.newFromJSON( {
				latitude: 0,
				longitude: 0,
				precision: 1
			} ),
			sameData = dataValues.GlobeCoordinateValue.newFromJSON( {
				latitude: 0,
				longitude: 0,
				precision: 1
			} ),
			onChange = sinon.stub();

		// Fake the parsevalue API response
		apiStub.get.returns(
			$.Deferred().resolve( fakeCoordinates.first ).promise()
		);

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );
} );
