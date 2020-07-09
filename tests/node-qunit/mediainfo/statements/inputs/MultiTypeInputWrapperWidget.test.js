'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../../resources/statements/inputs/MultiTypeInputWrapperWidget.js',
	pathToEntityInputWidget = '../../../../../resources/statements/inputs/EntityInputWidget.js',
	pathToStringInputWidget = '../../../../../resources/statements/inputs/StringInputWidget',
	pathToMonolingualTextInputWidget = '../../../../../resources/statements/inputs/MonolingualTextInputWidget.js',
	pathToQuantityInputWidget = '../../../../../resources/statements/inputs/QuantityInputWidget.js',
	pathToTimeInputWidget = '../../../../../resources/statements/inputs/TimeInputWidget.js',
	pathToGlobeCoordinateInputWidget = '../../../../../resources/statements/inputs/GlobeCoordinateInputWidget.js',
	pathToUnsupportedInputWidget = '../../../../../resources/statements/inputs/UnsupportedInputWidget.js',
	hooks = require( '../../../support/hooks.js' );

QUnit.module( 'MultiTypeInputWrapperWidget', hooks.kartographer, function () {
	QUnit.test( 'Valid data roundtrip (wikibase-entityid)', function ( assert ) {
		const done = assert.async(),
			datamodel = require( 'wikibase.datamodel' ),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new datamodel.EntityId( 'Q1' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (string)', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.StringValue( 'this is a test' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (monolingualtext)', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.MonolingualTextValue( 'en', 'this is a test' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (quantity)', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.QuantityValue( new dataValues.DecimalValue( 5 ), '1' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (time)', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.TimeValue( '+2019-01-24T00:00:00Z', {
				timezone: 0,
				before: 0,
				after: 0,
				precision: 10,
				calendarmodel: 'http://www.wikidata.org/entity/Q1985786'
			} );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (globecoordinate)', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.GlobeCoordinateValue(
				new globeCoordinate.GlobeCoordinate( {
					latitude: 0,
					longitude: 0,
					precision: 1
				} )
			);

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip (unsupported)', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.UnknownValue( 'an unknown value' );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
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
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
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
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.StringValue( 'this is a test' );

		widget.setData( data )
			.then( widget.setInputType.bind( widget, 'string' ) )
			.then( function () {
				assert.strictEqual( data.equals( widget.getData() ), true );
				done();
			} );
	} );

	QUnit.test( 'Changing to other input type (and back) wipes out existing data', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = new dataValues.StringValue( 'this is a test' );

		widget.setData( data )
			.then( widget.setInputType.bind( widget, 'quantity' ) )
			.then( widget.setInputType.bind( widget, 'string' ) )
			.then( function () {
				assert.strictEqual( data.equals( widget.getData() ), false );
				done();
			} );
	} );

	QUnit.test( 'Widget creates the correct input type', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			EntityInputWidget = require( pathToEntityInputWidget ),
			StringInputWidget = require( pathToStringInputWidget ),
			MonolingualTextInputWidget = require( pathToMonolingualTextInputWidget ),
			QuantityInputWidget = require( pathToQuantityInputWidget ),
			TimeInputWidget = require( pathToTimeInputWidget ),
			GlobeCoordinateInputWidget = require( pathToGlobeCoordinateInputWidget ),
			UnsupportedInputWidget = require( pathToUnsupportedInputWidget ),
			entityWidget = new MultiTypeInputWrapperWidget( {
				type: 'wikibase-entityid'
			} ),
			stringWidget = new MultiTypeInputWrapperWidget( {
				type: 'string'
			} ),
			monolingualTextWidget = new MultiTypeInputWrapperWidget( {
				type: 'monolingualtext'
			} ),
			quantityWidget = new MultiTypeInputWrapperWidget( {
				type: 'quantity'
			} ),
			timeWidget = new MultiTypeInputWrapperWidget( {
				type: 'time'
			} ),
			globeCoordinateWidget = new MultiTypeInputWrapperWidget( {
				type: 'globecoordinate'
			} ),
			unsupportedWidget = new MultiTypeInputWrapperWidget( {
				type: 'anotherthing'
			} );

		$.when(
			entityWidget.render(),
			stringWidget.render(),
			monolingualTextWidget.render(),
			quantityWidget.render(),
			timeWidget.render(),
			globeCoordinateWidget.render(),
			unsupportedWidget.render()
		).then( function () {
			assert.strictEqual( entityWidget.state.input instanceof EntityInputWidget, true );
			assert.strictEqual( stringWidget.state.input instanceof StringInputWidget, true );
			assert.strictEqual( monolingualTextWidget.state.input instanceof MonolingualTextInputWidget, true );
			assert.strictEqual( quantityWidget.state.input instanceof QuantityInputWidget, true );
			assert.strictEqual( timeWidget.state.input instanceof TimeInputWidget, true );
			assert.strictEqual( globeCoordinateWidget.state.input instanceof GlobeCoordinateInputWidget, true );
			assert.strictEqual( unsupportedWidget.state.input instanceof UnsupportedInputWidget, true );
			done();
		} );
	} );

	QUnit.test( 'add event is fired when child input emits add', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget( {
				type: 'string'
			} ),
			callStub = sinon.stub();

		widget.on( 'add', callStub );

		widget.render().then( function () {
			// trigger an 'add' event
			widget.state.input.emit( 'add' );

			// events are async, let's attach this check to the end of the call
			// stack to give the event handler time to run
			setTimeout( function () {
				assert.strictEqual( callStub.called, true );
				done();
			} );
		} );
	} );

	QUnit.test( 'setErrors adds MessageWidget to UI and flags string input as invalid', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget( {
				type: 'string'
			} );

		widget.state.input.input.setValidityFlag = sinon.stub();
		widget.setErrors( [ 'Invalid string input' ] )
			.then( function () {
				assert.strictEqual( widget.$element.find( '.wbmi-statement-error-msg' ).length, 1 );
				assert.strictEqual( widget.state.input.input.setValidityFlag.called, true );
				done();
			} );

	} );

	QUnit.test( 'Widget can handle multiple errors', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget( {
				type: 'string'
			} );

		widget.state.input.input.setValidityFlag = sinon.stub();
		widget.setErrors( [ 'Error 1', 'Error 2' ] )
			.then( function () {
				assert.strictEqual( widget.$element.find( '.wbmi-statement-error-msg' ).length, 2 );
				assert.strictEqual( widget.state.input.input.setValidityFlag.called, true );
				done();
			} );
	} );

	QUnit.test( 'Setting snak type to somevalue changes input to disabled string input', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = null,
			StringInputWidget = require( pathToStringInputWidget );

		widget.setDataType( 'wikibase-entityid' )
			.then( widget.setData.bind( widget, data ) )
			.then( widget.setSnakType.bind( widget, 'somevalue' ) )
			// Since the above method isn't asynchronous but leads to an async
			// process, let's run an empty setState call before checking
			// the final result.
			.then( widget.setState.bind( widget, {} ) )
			.then( function () {
				assert.strictEqual( widget.state.input instanceof StringInputWidget, true );
				assert.strictEqual( widget.state.input.input.isDisabled(), true );
				done();
			} );
	} );

	QUnit.test( 'Setting snak type to novalue changes input to disabled string input', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = null,
			StringInputWidget = require( pathToStringInputWidget );

		widget.setDataType( 'wikibase-entityid' )
			.then( widget.setData.bind( widget, data ) )
			.then( widget.setSnakType.bind( widget, 'novalue' ) )
			.then( widget.setState.bind( widget, {} ) )
			.then( function () {
				assert.strictEqual( widget.state.input instanceof StringInputWidget, true );
				assert.strictEqual( widget.state.input.input.isDisabled(), true );
				done();
			} );
	} );

	QUnit.test( 'Setting snak type to value changes input to original type', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget(),
			data = null,
			EntityInputWidget = require( pathToEntityInputWidget );

		widget.setDataType( 'wikibase-entityid' )
			.then( widget.setData.bind( widget, data ) )
			.then( widget.setSnakType.bind( widget, 'novalue' ) )
			.then( widget.setState.bind( widget, {} ) )
			.then( widget.snakTypeWidget.setValue.bind( widget.snakTypeWidget, 'value' ) )
			.then( widget.setState.bind( widget, {} ) )
			.then( function () {
				assert.strictEqual( widget.state.input instanceof EntityInputWidget, true );
				done();
			} );
	} );

	QUnit.test( 'Datatype can be set explicitly', function ( assert ) {
		const done = assert.async(),
			MultiTypeInputWrapperWidget = require( pathToWidget ),
			widget = new MultiTypeInputWrapperWidget();

		widget.setDataType( 'wikibase-entityid' )
			.then( function () {
				assert.strictEqual( widget.state.type, 'wikibase-entityid' );
				done();
			} );
	} );
} );
