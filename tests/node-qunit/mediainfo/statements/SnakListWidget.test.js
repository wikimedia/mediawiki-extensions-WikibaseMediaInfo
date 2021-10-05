'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/SnakListWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'SnakListWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		const done = assert.async(),
			datamodel = require( 'wikibase.datamodel' ),
			SnakListWidget = require( pathToWidget ),
			widget = new SnakListWidget(),
			data = new datamodel.SnakList( [
				new datamodel.PropertyValueSnak(
					'P1',
					new datamodel.EntityId( 'Q1' )
				)
			] );

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		const done = assert.async(),
			SnakListWidget = require( pathToWidget ),
			widget = new SnakListWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.SnakList( [
				new datamodel.PropertyValueSnak(
					'P1',
					new datamodel.EntityId( 'Q1' )
				)
			] ),
			newData = new datamodel.SnakList( [
				new datamodel.PropertyValueSnak(
					'P1',
					new datamodel.EntityId( 'Q2' )
				)
			] ),
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
			SnakListWidget = require( pathToWidget ),
			widget = new SnakListWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.SnakList( [
				new datamodel.PropertyValueSnak(
					'P1',
					new datamodel.EntityId( 'Q1' )
				)
			] ),
			sameData = new datamodel.SnakList( [
				new datamodel.PropertyValueSnak(
					'P1',
					new datamodel.EntityId( 'Q1' )
				)
			] ),
			onChange = sinon.stub();

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'createWidget() returns a new SnakWidget', function ( assert ) {
		const done = assert.async(),
			SnakListWidget = require( pathToWidget ),
			SnakWidget = require( '../../../../resources/statements/SnakWidget.js' ),
			widget = new SnakListWidget();

		widget.createWidget()
			.then( function ( snak ) {
				assert.strictEqual( snak instanceof SnakWidget, true );
				done();
			} );
	} );

	QUnit.test( 'createWidget sets SnakWidget data when snak is provided', function ( assert ) {
		const done = assert.async(),
			SnakListWidget = require( pathToWidget ),
			datamodel = require( 'wikibase.datamodel' ),
			widget = new SnakListWidget();

		const data = new datamodel.PropertyValueSnak(
			'P1',
			new datamodel.EntityId( 'Q1' )
		);

		widget.createWidget( data )
			.then( function ( snak ) {
				assert.strictEqual( data.equals( snak.getData() ), true );
				done();
			} );
	} );

	QUnit.test( 'addWidget creates a new SnakWidget every time it is called', function ( assert ) {
		const done = assert.async(),
			SnakListWidget = require( pathToWidget ),
			widget = new SnakListWidget(),
			spy = sinon.spy( widget, 'createWidget' ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.SnakList( [
				new datamodel.PropertyValueSnak(
					'P1',
					new datamodel.EntityId( 'Q1' )
				)
			] );

		widget.setData( data );
		widget.render().then( function () {
			assert.strictEqual( spy.callCount, 0 );

			widget.addWidget();
			assert.strictEqual( spy.callCount, 1 );

			widget.addWidget();
			assert.strictEqual( spy.callCount, 2 );

			done();
		} );
	} );

	QUnit.test( 'Valid data roundtrip with somevalue snak', function ( assert ) {
		const done = assert.async(),
			SnakListWidget = require( pathToWidget ),
			widget = new SnakListWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.SnakList( [
				new datamodel.PropertySomeValueSnak( 'P1' )
			] );

		widget.setData( data )
			.then( function () {
				assert.strictEqual( data.equals( widget.getData() ), true );
				done();
			} );
	} );

	QUnit.test( 'Valid data roundtrip with novalue snak', function ( assert ) {
		const done = assert.async(),
			SnakListWidget = require( pathToWidget ),
			widget = new SnakListWidget(),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.SnakList( [
				new datamodel.PropertyNoValueSnak( 'P1' )
			] );

		widget.setData( data )
			.then( function () {
				assert.strictEqual( data.equals( widget.getData() ), true );
				done();
			} );
	} );
} );
