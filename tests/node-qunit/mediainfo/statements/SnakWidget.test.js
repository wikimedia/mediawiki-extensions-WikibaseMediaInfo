'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/SnakWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'SnakWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		const done = assert.async(),
			datamodel = require( 'wikibase.datamodel' ),
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			);

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		const done = assert.async(),
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			),
			newData = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q2' )
			),
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
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			),
			sameData = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			),
			onChange = sinon.stub();

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'setData() sets property ID in the PropertyInput widget', function ( assert ) {
		const done = assert.async(),
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			);

		widget.setData( data ).then( function () {
			assert.strictEqual( widget.propertyInput.getData().toJSON().id, data.getPropertyId() );
			done();
		} );
	} );

	QUnit.test( 'setData() sets value data in the valueInput widget', function ( assert ) {
		const done = assert.async(),
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			);

		widget.setData( data ).then( function () {
			assert.strictEqual( widget.valueInput.getData().equals( data.getValue() ), true );
			done();
		} );
	} );

	QUnit.test( 'Property labels are available after API calls complete', function ( assert ) {
		const SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			),
			propertyLabel = 'some property',
			valueLabel = 'some value',
			formatPropertyStub = sinon.stub( widget.propertyInput.input, 'formatValue' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			done = assert.async();

		formatPropertyStub.returns( $.Deferred().resolve( propertyLabel ).promise( { abort: function () {} } ) );
		formatValueStub.returns( $.Deferred().resolve( valueLabel ).promise( { abort: function () {} } ) );
		widget.setData( data );

		setTimeout( function () {
			assert.strictEqual( formatPropertyStub.called, true );
			assert.strictEqual( widget.propertyInput.input.getValue(), propertyLabel );
			done();
		}, 200 );
	} );

	QUnit.test( 'Test enabling edit state', function ( assert ) {
		const done = assert.async(),
			SnakWidget = require( pathToWidget ),
			datamodel = require( 'wikibase.datamodel' ),
			widget = new SnakWidget( { editing: false } ),
			formatPropertyStub = sinon.stub( widget, 'formatProperty' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			);

		formatPropertyStub.returns( $.Deferred().resolve( 'some property' ).promise( { abort: function () {} } ) );
		formatValueStub.returns( $.Deferred().resolve( 'some value' ).promise( { abort: function () {} } ) );
		widget.setData( data );

		// wait for initial render to complete
		widget.render().then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-snak-value' ).length, 1 );

			widget.setEditing( true ).then( function ( $innerElement ) {
				assert.strictEqual( $innerElement.find( '.wbmi-snak-value' ).length, 0 );
				done();
			} );
		} );
	} );

	QUnit.test( 'Test disabling edit state', function ( assert ) {
		const done = assert.async(),
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget( { editing: true } ),
			formatPropertyStub = sinon.stub( widget, 'formatProperty' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.PropertyValueSnak(
				'P1',
				new datamodel.EntityId( 'Q1' )
			);

		formatPropertyStub.returns( $.Deferred().resolve( 'some property' ).promise( { abort: function () {} } ) );
		formatValueStub.returns( $.Deferred().resolve( 'some value' ).promise( { abort: function () {} } ) );
		widget.setData( data );

		// wait for initial render to complete
		widget.render().then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-snak-value' ).length, 0 );

			widget.setEditing( false ).then( function ( $innerElement ) {
				assert.strictEqual( $innerElement.find( '.wbmi-snak-value' ).length, 1 );
				done();
			} );
		} );
	} );

	QUnit.test( 'Valid data roundtrip with somevalue snak', function ( assert ) {
		const done = assert.async(),
			datamodel = require( 'wikibase.datamodel' ),
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			data = new datamodel.PropertySomeValueSnak( 'P1' );

		widget.setData( data )
			// setData sets the snak type on the input wrapper widget. That
			// should trigger the snak type widget's onChange method, but it
			// doesn't seem to do that in this testing environment.
			// Instead, let's run it directly.
			.then( widget.valueInput.onSnakTypeChange.bind( widget.valueInput, data.getType() ) )
			.then( function () {
				assert.ok( widget.getData() );
				assert.strictEqual( data.equals( widget.getData() ), true );
				done();
			} );
	} );

	QUnit.test( 'Valid data roundtrip with novalue snak', function ( assert ) {
		const done = assert.async(),
			datamodel = require( 'wikibase.datamodel' ),
			SnakWidget = require( pathToWidget ),
			widget = new SnakWidget(),
			data = new datamodel.PropertyNoValueSnak( 'P1' );

		widget.setData( data )
			// setData sets the snak type on the input wrapper widget. That
			// should trigger the snak type widget's onChange method, but it
			// doesn't seem to do that in this testing environment.
			// Instead, let's run it directly.
			.then( widget.valueInput.onSnakTypeChange.bind( widget.valueInput, data.getType() ) )
			.then( function () {
				assert.ok( widget.getData() );
				assert.strictEqual( data.equals( widget.getData() ), true );
				done();
			} );
	} );
} );
