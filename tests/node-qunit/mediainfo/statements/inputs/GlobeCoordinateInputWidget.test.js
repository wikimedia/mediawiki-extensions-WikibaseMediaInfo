var sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/GlobeCoordinateInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'GlobeCoordinateInputWidget', hooks.kartographer, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
			data = dataValues.GlobeCoordinateValue.newFromJSON( {
				latitude: 0,
				longitude: 0,
				precision: 1
			} );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
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

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, newData ) )
			.then( function () {
				assert.strictEqual( onChange.called, true );
				done();
			} );
	} );

	QUnit.test( 'Setting same data does not trigger a change event', function ( assert ) {
		var done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
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

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'Latitude validation', function ( assert ) {
		var GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget();

		assert.strictEqual( widget.validateInput( 'latitude', String( 0 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( 1 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( -1 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( 1.5 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( -1.5 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( 89 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( -89 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( 89.9 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( -89.9 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( 90 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( -90 ) ), true );
		assert.strictEqual( widget.validateInput( 'latitude', String( 90.1 ) ), false );
		assert.strictEqual( widget.validateInput( 'latitude', String( -90.1 ) ), false );
		assert.strictEqual( widget.validateInput( 'latitude', String( 91 ) ), false );
		assert.strictEqual( widget.validateInput( 'latitude', String( -91 ) ), false );

		// below are not theoretically possible because input should always
		// be a numeric string, as per the input field's constraints
		// but let's test them anyway :)
		assert.strictEqual( widget.validateInput( 'latitude', 'a' ), false );
		assert.strictEqual( widget.validateInput( 'latitude', Infinity ), false );
		assert.strictEqual( widget.validateInput( 'latitude', NaN ), false );
	} );

	QUnit.test( 'Longitude validation', function ( assert ) {
		var GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget();

		assert.strictEqual( widget.validateInput( 'longitude', String( 0 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 1 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( -1 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 1.5 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( -1.5 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 90 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( -90 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 91 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( -91 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 179 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( -179 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 179.9 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( -179.9 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 180 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( -180 ) ), true );
		assert.strictEqual( widget.validateInput( 'longitude', String( 180.1 ) ), false );
		assert.strictEqual( widget.validateInput( 'longitude', String( -180.1 ) ), false );
		assert.strictEqual( widget.validateInput( 'longitude', String( 181 ) ), false );
		assert.strictEqual( widget.validateInput( 'longitude', String( -181 ) ), false );

		// below are not theoretically possible because input should always
		// be a numeric string, as per the input field's constraints
		// but let's test them anyway :)
		assert.strictEqual( widget.validateInput( 'longitude', 'a' ), false );
		assert.strictEqual( widget.validateInput( 'longitude', Infinity ), false );
		assert.strictEqual( widget.validateInput( 'longitude', NaN ), false );
	} );
} );
