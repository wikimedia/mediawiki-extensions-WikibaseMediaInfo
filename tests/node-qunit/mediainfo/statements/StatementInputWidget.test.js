var pathToWidget = '../../../../resources/statements/StatementInputWidget.js',
	pathToEntityInputWidget = '../../../../resources/statements/inputs/EntityInputWidget.js',
	pathToStringInputWidget = '../../../../resources/statements/inputs/StringInputWidget',
	pathToQuantityInputWidget = '../../../../resources/statements/inputs/QuantityInputWidget.js',
	pathToGlobeCoordinateInputWidget = '../../../../resources/statements/inputs/GlobeCoordinateInputWidget.js',
	pathToUnsupportedInputWidget = '../../../../resources/statements/inputs/UnsupportedInputWidget.js',
	sinon = require( 'sinon' ),
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'StatementInputWidget', hooks.mediainfo, function () {
	QUnit.test( 'Widget creates the correct input type', function ( assert ) {
		var StatementInputWidget = require( pathToWidget ),
			EntityInputWidget = require( pathToEntityInputWidget ),
			StringInputWidget = require( pathToStringInputWidget ),
			QuantityInputWidget = require( pathToQuantityInputWidget ),
			GlobeCoordinateInputWidget = require( pathToGlobeCoordinateInputWidget ),
			UnsupportedInputWidget = require( pathToUnsupportedInputWidget ),
			entityWidget = new StatementInputWidget( {
				propertyType: 'wikibase-item',
				valueType: 'wikibase-entityid'
			} ),
			stringWidget = new StatementInputWidget( {
				propertyType: 'url',
				valueType: 'string'
			} ),
			quantityWidget = new StatementInputWidget( {
				propertyType: 'quantity',
				valueType: 'quantity'
			} ),
			globeCoordinateWidget = new StatementInputWidget( {
				propertyType: 'globe-coordinate',
				valueType: 'globecoordinate'
			} ),
			unsupportedWidget = new StatementInputWidget( {
				propertyType: 'something',
				valueType: 'anotherthing'
			} );

		assert.strictEqual( entityWidget.input instanceof EntityInputWidget, true );
		assert.strictEqual( stringWidget.input instanceof StringInputWidget, true );
		assert.strictEqual( quantityWidget.input instanceof QuantityInputWidget, true );
		assert.strictEqual( globeCoordinateWidget.input instanceof GlobeCoordinateInputWidget, true );
		assert.strictEqual( unsupportedWidget.input instanceof UnsupportedInputWidget, true );
	} );

	QUnit.test( 'onAdd method is called when a value is entered', function ( assert ) {
		var StatementInputWidget = require( pathToWidget ),
			widget = new StatementInputWidget( {
				propertyType: 'url',
				valueType: 'string'
			} ),
			done = assert.async();

		widget.onAdd = sinon.stub();

		// Set a value, then trigger add event.
		widget.input.setState( { value: 'http://example.com' } )
			.then( widget.input.onEnter() )
			.then( function () {
				assert.strictEqual( widget.onAdd.called, true );
				done();
			} );

	} );

	QUnit.test( 'setError adds MessageWidget to UI and flags string input as invalid', function ( assert ) {
		var StatementInputWidget = require( pathToWidget ),
			widget = new StatementInputWidget( {
				propertyType: 'url',
				valueType: 'string'
			} ),
			done = assert.async();

		widget.input.input.setValidityFlag = sinon.stub();
		widget.setError( 'Invalid string input' )
			.then( function () {
				assert.strictEqual( widget.$element.find( '.wbmi-statement-error-msg' ).length, 1 );
				assert.strictEqual( widget.input.input.setValidityFlag.called, true );
				done();
			} );

	} );
} );
