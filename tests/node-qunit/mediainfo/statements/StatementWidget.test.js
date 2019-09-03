var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/StatementWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'StatementWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				entityId: 'M1'
			} ),
			data = new wikibase.datamodel.StatementList( [
				new wikibase.datamodel.Statement(
					new wikibase.datamodel.Claim(
						new wikibase.datamodel.PropertyValueSnak(
							'P1',
							new wikibase.datamodel.EntityId( 'Q1' )
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
		var done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				entityId: 'M1'
			} ),
			data = new wikibase.datamodel.StatementList( [
				new wikibase.datamodel.Statement(
					new wikibase.datamodel.Claim(
						new wikibase.datamodel.PropertyValueSnak(
							'P1',
							new wikibase.datamodel.EntityId( 'Q1' )
						)
					)
				)
			] ),
			newData = new wikibase.datamodel.StatementList( [
				new wikibase.datamodel.Statement(
					new wikibase.datamodel.Claim(
						new wikibase.datamodel.PropertyValueSnak(
							'P1',
							new wikibase.datamodel.EntityId( 'Q2' )
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
		var done = assert.async(),
			StatementWidget = require( pathToWidget ),
			widget = new StatementWidget( {
				$element: $( '<div>' ),
				propertyId: 'P1',
				entityId: 'M1'
			} ),
			data = new wikibase.datamodel.StatementList( [
				new wikibase.datamodel.Statement(
					new wikibase.datamodel.Claim(
						new wikibase.datamodel.PropertyValueSnak(
							'P1',
							new wikibase.datamodel.EntityId( 'Q1' )
						)
					)
				)
			] ),
			sameData = new wikibase.datamodel.StatementList( [
				new wikibase.datamodel.Statement(
					new wikibase.datamodel.Claim(
						new wikibase.datamodel.PropertyValueSnak(
							'P1',
							new wikibase.datamodel.EntityId( 'Q1' )
						)
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
} );
