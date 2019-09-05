var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/GlobeCoordinateInputWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'GlobeCoordinateInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
			data = { latitude: 0, longitude: 0, precision: 1 };

		widget.setData( data ).then( function () {
			var oldData = new globeCoordinate.GlobeCoordinate( data ),
				newData = new globeCoordinate.GlobeCoordinate( widget.getData() );

			assert.ok( widget.getData() );
			assert.strictEqual( oldData.equals( newData ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget(),
			data = { latitude: 0, longitude: 0, precision: 1 },
			newData = { latitude: 1, longitude: 0, precision: 1 },
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
			data = { latitude: 0, longitude: 0, precision: 1 },
			sameData = { latitude: 0, longitude: 0, precision: 1 },
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

		assert.strictEqual( widget.validateInput( String( 0 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( 1 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( -1 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( 1.5 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( -1.5 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( 89 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( -89 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( 89.9 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( -89.9 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( 90 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( -90 ), 'latitude' ), true );
		assert.strictEqual( widget.validateInput( String( 90.1 ), 'latitude' ), false );
		assert.strictEqual( widget.validateInput( String( -90.1 ), 'latitude' ), false );
		assert.strictEqual( widget.validateInput( String( 91 ), 'latitude' ), false );
		assert.strictEqual( widget.validateInput( String( -91 ), 'latitude' ), false );

		// below are not theoretically possible because input should always
		// be a numeric string, as per the input field's constraints
		// but let's test them anyway :)
		assert.strictEqual( widget.validateInput( 'a', 'latitude' ), false );
		assert.strictEqual( widget.validateInput( Infinity, 'latitude' ), false );
		assert.strictEqual( widget.validateInput( NaN, 'latitude' ), false );
	} );

	QUnit.test( 'Longitude validation', function ( assert ) {
		var GlobeCoordinateInputWidget = require( pathToWidget ),
			widget = new GlobeCoordinateInputWidget();

		assert.strictEqual( widget.validateInput( String( 0 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 1 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( -1 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 1.5 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( -1.5 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 90 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( -90 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 91 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( -91 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 179 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( -179 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 179.9 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( -179.9 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 180 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( -180 ), 'longitude' ), true );
		assert.strictEqual( widget.validateInput( String( 180.1 ), 'longitude' ), false );
		assert.strictEqual( widget.validateInput( String( -180.1 ), 'longitude' ), false );
		assert.strictEqual( widget.validateInput( String( 181 ), 'longitude' ), false );
		assert.strictEqual( widget.validateInput( String( -181 ), 'longitude' ), false );

		// below are not theoretically possible because input should always
		// be a numeric string, as per the input field's constraints
		// but let's test them anyway :)
		assert.strictEqual( widget.validateInput( 'a', 'longitude' ), false );
		assert.strictEqual( widget.validateInput( Infinity, 'longitude' ), false );
		assert.strictEqual( widget.validateInput( NaN, 'longitude' ), false );
	} );
} );
