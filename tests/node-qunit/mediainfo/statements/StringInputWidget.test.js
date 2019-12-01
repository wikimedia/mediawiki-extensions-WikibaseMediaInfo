var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/StringInputWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'StringInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget(),
			data = 'this is a string';

		widget.setData( data ).then( function () {
			var oldData = new dataValues.StringValue( data ),
				newData = new dataValues.StringValue( widget.getData() );

			assert.ok( widget.getData() );
			assert.strictEqual( oldData.equals( newData ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget(),
			data = 'this is a string',
			newData = 'this is another string',
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
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget(),
			data = 'this is a string',
			sameData = 'this is a string',
			onChange = sinon.stub();

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'Widget has no button in qualifier mode', function ( assert ) {
		var done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget( { isQualifier: true } ),
			data = 'this is a string';

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-string-input-button' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget has button in statement mode', function ( assert ) {
		var done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget( { isQualifier: false } ),
			data = 'this is a string';

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-string-input-button' ).length, 1 );
			done();
		} );
	} );
} );
