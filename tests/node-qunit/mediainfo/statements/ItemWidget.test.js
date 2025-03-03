'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/ItemWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'ItemWidget', hooks.mediainfo, () => {
	QUnit.test( 'Valid data roundtrip', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data ).then( () => {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					),
					new datamodel.SnakList( [
						new datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						)
					] )
				)
			),
			newData = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					),
					new datamodel.SnakList( [
						new datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a different string value' )
						)
					] )
				)
			),
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
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					),
					new datamodel.SnakList( [
						new datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						)
					] )
				)
			),
			sameData = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					),
					new datamodel.SnakList( [
						new datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						)
					] )
				)
			),
			onChange = sinon.stub();

		widget.setData( data )
			.then( widget.on.bind( widget, 'change', onChange, [] ) )
			.then( widget.setData.bind( widget, sameData ) )
			.then( () => {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'Widget updates snak widgets with new data', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			noQualifiers = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					)
				)
			),
			oneQualifier = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					),
					new datamodel.SnakList( [
						new datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						)
					] )
				)
			),
			twoQualifiers = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					),
					new datamodel.SnakList( [
						new datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						),
						new datamodel.PropertyValueSnak(
							'P3',
							new datamodel.EntityId( 'Q4' )
						)
					] )
				)
			);

		widget.setData( oneQualifier )
			.then( () => {
				assert.strictEqual( oneQualifier.equals( widget.getData() ), true );
			} )
			.then( widget.setData.bind( widget, twoQualifiers ) )
			.then( () => {
				assert.strictEqual( twoQualifiers.equals( widget.getData() ), true );
			} )
			.then( widget.setData.bind( widget, oneQualifier ) )
			.then( () => {
				assert.strictEqual( oneQualifier.equals( widget.getData() ), true );
			} )
			.then( widget.setData.bind( widget, noQualifiers ) )
			.then( () => {
				assert.strictEqual( noQualifiers.equals( widget.getData() ), true );
				done();
			} );
	} );

	QUnit.test( 'Test enabling edit state', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data )
			.then( widget.setEditing.bind( widget, true ) )
			.then( ( $element ) => {
				assert.strictEqual( $element.find( '.wbmi-item-read' ).length, 0 );
				assert.strictEqual( $element.find( '.wbmi-item-edit' ).length, 1 );

				// buttons to add snaklists (qualifiers & references) or remove item are available in edit mode
				assert.strictEqual( $element.find( '.wbmi-snaklist-add-snak' ).length, 2 );
				assert.strictEqual( $element.find( '.wbmi-item-remove' ).length, 1 );
				done();
			} );
	} );

	QUnit.test( 'Test disabling edit state', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data )
			.then( widget.setEditing.bind( widget, false ) )
			.then( ( $element ) => {
				assert.strictEqual( $element.find( '.wbmi-item-read' ).length, 1 );
				assert.strictEqual( $element.find( '.wbmi-item-edit' ).length, 0 );

				// buttons to add snak or remove item are not available in read mode
				assert.strictEqual( $element.find( '.wbmi-snaklist-add-snak' ).length, 0 );
				assert.strictEqual( $element.find( '.wbmi-item-remove' ).length, 0 );
				done();
			} );
	} );

	QUnit.test( 'Toggling item prominence changes item rank', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyValueSnak(
						'P1',
						new datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data )
			.then( () => {
				// default rank: normal
				assert.strictEqual( widget.getData().getRank(), datamodel.Statement.RANK.NORMAL );
			} )
			.then( widget.toggleItemProminence.bind( widget, { preventDefault: sinon.stub() } ) )
			.then( () => {
				assert.strictEqual( widget.getData().getRank(), datamodel.Statement.RANK.PREFERRED );
			} )
			.then( widget.toggleItemProminence.bind( widget, { preventDefault: sinon.stub() } ) )
			.then( () => {
				assert.strictEqual( widget.getData().getRank(), datamodel.Statement.RANK.NORMAL );
				done();
			} );
	} );

	QUnit.test( 'Valid data roundtrip with somevalue snak', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertySomeValueSnak( 'P1' )
				)
			);

		widget.setData( data )
			.then( () => {
				assert.strictEqual( data.equals( widget.getData() ), true );
				assert.strictEqual( widget.state.snakType, data.getClaim().getMainSnak().getType() );
				done();
			} );
	} );

	QUnit.test( 'Valid data roundtrip with novalue snak', ( assert ) => {
		const done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			datamodel = require( 'wikibase.datamodel' ),
			data = new datamodel.Statement(
				new datamodel.Claim(
					new datamodel.PropertyNoValueSnak( 'P1' )
				)
			);

		widget.setData( data )
			.then( () => {
				assert.strictEqual( data.equals( widget.getData() ), true );
				assert.strictEqual( widget.state.snakType, data.getClaim().getMainSnak().getType() );
				done();
			} );
	} );
} );
