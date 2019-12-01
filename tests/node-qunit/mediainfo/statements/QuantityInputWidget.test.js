var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/QuantityInputWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'QuantityInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = { amount: '+1', unit: '1' };

		widget.setData( data ).then( function () {
			var oldData = dataValues.QuantityValue.newFromJSON( data ),
				newData = dataValues.QuantityValue.newFromJSON( widget.getData() );

			assert.ok( widget.getData() );
			assert.strictEqual( oldData.equals( newData ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = { amount: '+1', unit: '1' },
			newData = { amount: '+2', unit: '1' },
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
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = { amount: '+1', unit: '1' },
			sameData = { amount: '+1', unit: '1' },
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
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget( { isQualifier: true } ),
			data = { amount: '+1', unit: '1' };

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-quantity-input-button' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget has button in statement mode', function ( assert ) {
		var done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget( { isQualifier: false } ),
			data = { amount: '+1', unit: '1' };

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-quantity-input-button' ).length, 1 );
			done();
		} );
	} );
} );
