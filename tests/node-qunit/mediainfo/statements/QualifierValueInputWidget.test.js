var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/QualifierValueInputWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'QualifierValueInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip (wikibase-entityid)', function ( assert ) {
		var done = assert.async(),
			datamodel = require( 'wikibase.datamodel' ),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new datamodel.EntityId( 'Q1' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (string)', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.StringValue( 'this is a test' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (quantity)', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.QuantityValue( new dataValues.DecimalValue( 5 ), '1' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (globecoordinate)', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.GlobeCoordinateValue( new globeCoordinate.GlobeCoordinate( { latitude: 0, longitude: 0, precision: 1 } ) );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (unsupported)', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.UnknownValue( 'an unknown value' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.StringValue( 'this is a test' ),
			newData = new dataValues.StringValue( 'this is a change' ),
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
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.StringValue( 'this is a test' ),
			sameData = new dataValues.StringValue( 'this is a test' ),
			onChange = sinon.stub();

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'Changing to same input type leaves existing value unaltered', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.StringValue( 'this is a test' );

		widget.setData( data )
			.then( widget.setInputType.bind( widget, 'string' ) )
			.then( function () {
				assert.strictEqual( data.equals( widget.getData() ), true );
				done();
			} );
	} );

	QUnit.test( 'Changing to other input type (and back) wipes out existing data', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new dataValues.StringValue( 'this is a test' );

		widget.setData( data )
			.then( widget.setInputType.bind( widget, 'quantity' ) )
			.then( widget.setInputType.bind( widget, 'string' ) )
			.then( function () {
				assert.strictEqual( data.equals( widget.getData() ), false );
				done();
			} );
	} );
} );
