'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/StatementWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'StatementWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		const done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				valueType: 'wikibase-entityid',
				entityId: 'M1'
			} ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						)
					)
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
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				valueType: 'wikibase-entityid',
				entityId: 'M1'
			} ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						)
					)
				)
			] ),
			newData = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q2' )
						)
					)
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
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				valueType: 'wikibase-entityid',
				entityId: 'M1'
			} ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						),
						null,
						'guid'
					)
				)
			] ),
			sameData = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						),
						null,
						'guid'
					)
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

	QUnit.test( 'Test detection of changes', function ( assert ) {
		const done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				valueType: 'wikibase-entityid',
				entityId: 'M1'
			} ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						),
						null,
						'guid-1'
					)
				),
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q2' )
						),
						null,
						'guid-2'
					)
				)
			] ),
			changedData = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						),
						null,
						'guid-1'
					)
				),
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q3' )
						),
						null,
						'guid-2'
					)
				)
			] ),
			removedData = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						),
						null,
						'guid-1'
					)
				)
			] );

		widget.resetData( data )
			.then( function () {
				assert.strictEqual( widget.hasChanges(), false );
				assert.strictEqual( widget.getChanges().length, 0 );
				assert.strictEqual( widget.getRemovals().length, 0 );
			} )
			.then( widget.setData.bind( widget, changedData ) )
			.then( function () {
				assert.strictEqual( widget.hasChanges(), true );
				assert.strictEqual( widget.getChanges().length, 1 );
				assert.strictEqual( widget.getRemovals().length, 0 );
			} )
			.then( widget.setData.bind( widget, removedData ) )
			.then( function () {
				assert.strictEqual( widget.hasChanges(), true );
				assert.strictEqual( widget.getChanges().length, 0 );
				assert.strictEqual( widget.getRemovals().length, 1 );
				done();
			} );
	} );

	QUnit.test( 'Test enabling edit state', function ( assert ) {
		const done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				valueType: 'wikibase-entityid',
				entityId: 'M1',
				showControls: true
			} ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						)
					)
				)
			] );

		widget.setData( data )
			.then( widget.setEditing.bind( widget, true ) )
			.then( function ( $element ) {
				// missing in edit mode: edit button; present: footer
				assert.strictEqual( $element.find( '.wbmi-entityview-editButton' ).length, 0 );
				assert.strictEqual( $element.find( '.wbmi-statement-footer' ).length, 1 );
				done();
			} );
	} );

	QUnit.test( 'Test disabling edit state', function ( assert ) {
		const done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				valueType: 'wikibase-entityid',
				entityId: 'M1',
				showControls: true
			} ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.StatementList( [
				new datamodel.Statement(
					new datamodel.Claim(
						new datamodel.PropertyValueSnak(
							'P1',
							new datamodel.EntityId( 'Q1' )
						)
					)
				)
			] );

		widget.setData( data )
			.then( widget.setEditing.bind( widget, false ) )
			.then( function ( $element ) {
				// missing in read mode: footer; present: edit button
				assert.strictEqual( $element.find( '.wbmi-entityview-editButton' ).length, 1 );
				assert.strictEqual( $element.find( '.wbmi-statement-footer' ).length, 0 );
				done();
			} );
	} );

	QUnit.test( 'Widget can handle multiple errors', function ( assert ) {
		const done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				propertyType: 'wikibase-item',
				entityId: 'M1',
				showControls: true
			} );

		widget.setErrors( [ 'Error 1', 'Error 2' ] )
			.then( function () {
				assert.strictEqual( widget.$element.find( '.wbmi-statement-error-msg' ).length, 2 );
				done();
			} );
	} );
} );
