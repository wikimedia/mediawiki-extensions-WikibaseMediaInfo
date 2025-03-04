'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/MonolingualTextInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'MonolingualText', hooks.mediainfo, () => {
	QUnit.test( 'Valid data roundtrip', ( assert ) => {
		const done = assert.async(),
			MonolingualTextInputWidget = require( pathToWidget ),
			widget = new MonolingualTextInputWidget(),
			data = dataValues.MonolingualTextValue.newFromJSON( { language: 'en', text: 'this is a test' } );

		widget.setData( data ).then( () => {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', ( assert ) => {
		const done = assert.async(),
			MonolingualTextInputWidget = require( pathToWidget ),
			widget = new MonolingualTextInputWidget(),
			data = dataValues.MonolingualTextValue.newFromJSON( { language: 'en', text: 'this is a test' } ),
			newData = dataValues.MonolingualTextValue.newFromJSON( { language: 'nl', text: 'dit is een test' } ),
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
			MonolingualTextInputWidget = require( pathToWidget ),
			widget = new MonolingualTextInputWidget(),
			data = dataValues.MonolingualTextValue.newFromJSON( { language: 'en', text: 'this is a test' } ),
			sameData = dataValues.MonolingualTextValue.newFromJSON( { language: 'en', text: 'this is a test' } ),
			onChange = sinon.stub();

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( () => {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'Widget has no button in qualifier mode', ( assert ) => {
		const done = assert.async(),
			MonolingualTextInputWidget = require( pathToWidget ),
			widget = new MonolingualTextInputWidget( { isQualifier: true } ),
			data = dataValues.MonolingualTextValue.newFromJSON( { language: 'en', text: 'this is a test' } );

		widget.setData( data ).then( ( $element ) => {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget has button in statement mode', ( assert ) => {
		const done = assert.async(),
			MonolingualTextInputWidget = require( pathToWidget ),
			widget = new MonolingualTextInputWidget( { isQualifier: false } ),
			data = dataValues.MonolingualTextValue.newFromJSON( { language: 'en', text: 'this is a test' } );

		widget.setData( data ).then( ( $element ) => {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 1 );
			done();
		} );
	} );
} );
