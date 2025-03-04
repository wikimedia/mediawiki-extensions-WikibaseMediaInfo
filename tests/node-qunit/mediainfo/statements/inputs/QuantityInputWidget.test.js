'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/QuantityInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'QuantityInputWidget', hooks.mediainfo, () => {
	QUnit.test( 'Valid data roundtrip', ( assert ) => {
		const done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } );

		widget.setData( data ).then( () => {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', ( assert ) => {
		const done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } ),
			newData = dataValues.QuantityValue.newFromJSON( { amount: '+2', unit: '1' } ),
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
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } ),
			sameData = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } ),
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
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget( { isQualifier: true } ),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } );

		widget.setData( data ).then( ( $element ) => {
			assert.strictEqual( $element.find( '.wbmi-input-widget--submit' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget has button in statement mode', ( assert ) => {
		const done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget( { isQualifier: false } ),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } );

		widget.setData( data ).then( ( $element ) => {
			assert.strictEqual( $element.find( '.wbmi-input-widget--submit' ).length, 1 );
			done();
		} );
	} );

	QUnit.test( 'Widget displays no options by default', ( assert ) => {
		const done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget();

		widget.render().then( ( $element ) => {
			assert.strictEqual( $element.find( '.wbmi-input-widget--options.wbmi-input-widget__active' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget displays button to add unit when focused', ( assert ) => {
		const done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } );

		widget.setData( data ).then( () => {
			widget.input.$input.trigger( 'focus' );

			// give handler for above event a change to run, and alter the state/rerender
			setTimeout( () => {
				widget.render().then( ( $element ) => {
					assert.strictEqual( $element.find( '.wbmi-input-widget--options.wbmi-input-widget__active' ).length, 1 );
					assert.strictEqual( $element.find( '.wbmi-input-widget--unit' ).length, 0 );
					assert.strictEqual( $element.find( '.wbmi-input-widget--add-unit' ).length, 1 );
					assert.strictEqual( $element.find( '.wbmi-input-widget--remove-unit' ).length, 0 );
					done();
				} );
			} );
		} );
	} );

	QUnit.test( 'Widget displays custom unit when it has one', ( assert ) => {
		const done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = dataValues.QuantityValue.newFromJSON( {
				amount: '+1',
				unit: 'http://wikidata.wiki.local.wmftest.net:8080/entity/Q1'
			} );

		widget.setData( data ).then( () => {
			widget.input.$input.trigger( 'focus' );

			// give handler for above event a change to run, and alter the state/rerender
			setTimeout( () => {
				widget.render().then( ( $element ) => {
					assert.strictEqual( $element.find( '.wbmi-input-widget--options.wbmi-input-widget__active' ).length, 1 );
					assert.strictEqual( $element.find( '.wbmi-input-widget--unit' ).length, 1 );
					assert.strictEqual( $element.find( '.wbmi-input-widget--add-unit' ).length, 0 );
					assert.strictEqual( $element.find( '.wbmi-input-widget--remove-unit' ).length, 1 );
					done();
				} );
			} );
		} );
	} );
} );
