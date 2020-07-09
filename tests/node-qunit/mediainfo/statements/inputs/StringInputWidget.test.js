'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/StringInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'StringInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		const done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget(),
			data = new dataValues.StringValue( 'this is a string' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		const done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget(),
			data = new dataValues.StringValue( 'this is a string' ),
			newData = new dataValues.StringValue( 'this is another string' ),
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
		const done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget(),
			data = new dataValues.StringValue( 'this is a string' ),
			sameData = new dataValues.StringValue( 'this is a string' ),
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
		const done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget( { isQualifier: true } ),
			data = new dataValues.StringValue( 'this is a string' );

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget has button in statement mode', function ( assert ) {
		const done = assert.async(),
			StringInputWidget = require( pathToWidget ),
			widget = new StringInputWidget( { isQualifier: false } ),
			data = new dataValues.StringValue( 'this is a string' );

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 1 );
			done();
		} );
	} );
} );
