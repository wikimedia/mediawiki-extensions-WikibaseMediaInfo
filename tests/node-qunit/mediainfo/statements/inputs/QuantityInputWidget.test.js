var sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/QuantityInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'QuantityInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget(),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } ),
			newData = dataValues.QuantityValue.newFromJSON( { amount: '+2', unit: '1' } ),
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
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } ),
			sameData = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } ),
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
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } );

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 0 );
			done();
		} );
	} );

	QUnit.test( 'Widget has button in statement mode', function ( assert ) {
		var done = assert.async(),
			QuantityInputWidget = require( pathToWidget ),
			widget = new QuantityInputWidget( { isQualifier: false } ),
			data = dataValues.QuantityValue.newFromJSON( { amount: '+1', unit: '1' } );

		widget.setData( data ).then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-input-widget__button' ).length, 1 );
			done();
		} );
	} );
} );
