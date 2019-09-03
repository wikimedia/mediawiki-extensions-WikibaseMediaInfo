var pathToWidget = '../../../../resources/statements/QualifierValueInputWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'QualifierValueInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip (wikibase-entityid)', function ( assert ) {
		var done = assert.async(),
			QualifierValueInputWidget = require( pathToWidget ),
			widget = new QualifierValueInputWidget(),
			data = new wikibase.datamodel.EntityId( 'Q1' );

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
} );
