var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/ItemWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'ItemWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					),
					new wikibase.datamodel.SnakList( [
						new wikibase.datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						)
					] )
				)
			),
			newData = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					),
					new wikibase.datamodel.SnakList( [
						new wikibase.datamodel.PropertyValueSnak(
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
			.then( function () {
				assert.strictEqual( onChange.called, true );
				done();
			} );
	} );

	QUnit.test( 'Setting same data does not trigger a change event', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					),
					new wikibase.datamodel.SnakList( [
						new wikibase.datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						)
					] )
				)
			),
			sameData = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					),
					new wikibase.datamodel.SnakList( [
						new wikibase.datamodel.PropertyValueSnak(
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
			.then( function () {
				assert.strictEqual( onChange.called, false );
				done();
			} );
	} );

	QUnit.test( 'Widget updates qualifier widgets with new data', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			noQualifiers = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			),
			oneQualifier = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					),
					new wikibase.datamodel.SnakList( [
						new wikibase.datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						)
					] )
				)
			),
			twoQualifiers = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					),
					new wikibase.datamodel.SnakList( [
						new wikibase.datamodel.PropertyValueSnak(
							'P2',
							new dataValues.StringValue( 'This is a string value' )
						),
						new wikibase.datamodel.PropertyValueSnak(
							'P3',
							new wikibase.datamodel.EntityId( 'Q4' )
						)
					] )
				)
			);

		widget.setData( oneQualifier )
			.then( function () {
				assert.strictEqual( widget.getItems().length, 1 );
				assert.strictEqual( oneQualifier.equals( widget.getData() ), true );
			} )
			.then( widget.setData.bind( widget, twoQualifiers ) )
			.then( function () {
				assert.strictEqual( widget.getItems().length, 2 );
				assert.strictEqual( twoQualifiers.equals( widget.getData() ), true );
			} )
			.then( widget.setData.bind( widget, oneQualifier ) )
			.then( function () {
				assert.strictEqual( widget.getItems().length, 1 );
				assert.strictEqual( oneQualifier.equals( widget.getData() ), true );
			} )
			.then( widget.setData.bind( widget, noQualifiers ) )
			.then( function () {
				assert.strictEqual( widget.getItems().length, 0 );
				assert.strictEqual( noQualifiers.equals( widget.getData() ), true );
				done();
			} );
	} );

	QUnit.test( 'createQualifier() returns a new QualifierWidget', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			QualifierWidget = require( '../../../../resources/statements/QualifierWidget.js' ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			qualifier;

		qualifier = widget.createQualifier();
		assert.strictEqual( qualifier instanceof QualifierWidget, true );
	} );

	QUnit.test( 'createQualifier sets QualifierWidget data when snak is provided', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			qualifier,
			data;

		data = new wikibase.datamodel.PropertyValueSnak(
			'P1',
			new wikibase.datamodel.EntityId( 'Q1' )
		);

		qualifier = widget.createQualifier( data );

		// qualifier's `setData` is async, so let's call `setState` (with no change)
		// to make sure that we'll wait until the change has propagated and data
		// has been set
		qualifier.setState( {} ).then( function () {
			assert.strictEqual( data.equals( qualifier.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'addQualifier creates a new QualifierWidget every time it is called', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			spy = sinon.spy( widget, 'createQualifier' ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data );
		widget.render().then( function () {
			assert.strictEqual( spy.callCount, 0 );

			widget.addQualifier();
			assert.strictEqual( spy.callCount, 1 );

			widget.addQualifier();
			assert.strictEqual( spy.callCount, 2 );

			done();
		} );
	} );

	QUnit.test( 'Test enabling edit state', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data )
			.then( widget.setEditing.bind( widget, true ) )
			.then( function ( $element ) {
				assert.strictEqual( $element.find( '.wbmi-item-read' ).length, 0 );
				assert.strictEqual( $element.find( '.wbmi-item-edit' ).length, 1 );

				// buttons to add qualifier or remove item are available in edit mode
				assert.strictEqual( $element.find( '.wbmi-item-qualifier-add' ).length, 1 );
				assert.strictEqual( $element.find( '.wbmi-item-remove' ).length, 1 );
				done();
			} );
	} );

	QUnit.test( 'Test disabling edit state', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data )
			.then( widget.setEditing.bind( widget, false ) )
			.then( function ( $element ) {
				assert.strictEqual( $element.find( '.wbmi-item-read' ).length, 1 );
				assert.strictEqual( $element.find( '.wbmi-item-edit' ).length, 0 );

				// buttons to add qualifier or remove item are not available in read mode
				assert.strictEqual( $element.find( '.wbmi-item-qualifier-add' ).length, 0 );
				assert.strictEqual( $element.find( '.wbmi-item-remove' ).length, 0 );
				done();
			} );
	} );

	QUnit.test( 'Toggling item prominence changes item rank', function ( assert ) {
		var done = assert.async(),
			ItemWidget = require( pathToWidget ),
			widget = new ItemWidget( { propertyId: 'P1' } ),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data )
			.then( function () {
				// default rank: normal
				assert.strictEqual( widget.getData().getRank(), wikibase.datamodel.Statement.RANK.NORMAL );
			} )
			.then( widget.toggleItemProminence.bind( widget, { preventDefault: sinon.stub() } ) )
			.then( function () {
				assert.strictEqual( widget.getData().getRank(), wikibase.datamodel.Statement.RANK.PREFERRED );
			} )
			.then( widget.toggleItemProminence.bind( widget, { preventDefault: sinon.stub() } ) )
			.then( function () {
				assert.strictEqual( widget.getData().getRank(), wikibase.datamodel.Statement.RANK.NORMAL );
				done();
			} );
	} );
} );
