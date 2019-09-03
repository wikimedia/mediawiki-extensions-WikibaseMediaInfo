var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/QualifierWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'QualifierWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var done = assert.async(),
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			);

		widget.setData( data ).then( function () {
			assert.ok( widget.getData() );
			assert.strictEqual( data.equals( widget.getData() ), true );
			done();
		} );
	} );

	QUnit.test( 'Setting other data triggers a change event', function ( assert ) {
		var done = assert.async(),
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			),
			newData = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q2' )
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
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			),
			sameData = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
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
		var done = assert.async(),
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			);

		widget.setData( data ).then( function () {
			assert.strictEqual( widget.propertyInput.getData().id, data.getPropertyId() );
			done();
		} );
	} );

	QUnit.test( 'setData() sets value data in the valueInput widget', function ( assert ) {
		var done = assert.async(),
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			);

		widget.setData( data ).then( function () {
			assert.strictEqual( widget.valueInput.getData().equals( data.getValue() ), true );
			done();
		} );
	} );

	QUnit.test( 'Property labels are available after API calls complete', function ( assert ) {
		var QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			),
			propertyLabel = 'some property',
			valueLabel = 'some value',
			formatPropertyStub = sinon.stub( widget, 'formatProperty' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			done = assert.async();

		formatPropertyStub.returns( $.Deferred().resolve( propertyLabel ).promise( { abort: function () {} } ) );
		formatValueStub.returns( $.Deferred().resolve( valueLabel ).promise( { abort: function () {} } ) );
		widget.setData( data );

		setTimeout( function () {
			assert.strictEqual( formatPropertyStub.called, true );
			assert.strictEqual( widget.propertyInput.getData().label, propertyLabel );
			done();
		}, 200 );
	} );

	QUnit.test( 'Test enabling edit state', function ( assert ) {
		var done = assert.async(),
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget( { editing: false } ),
			formatPropertyStub = sinon.stub( widget, 'formatProperty' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			);

		formatPropertyStub.returns( $.Deferred().resolve( 'some property' ).promise( { abort: function () {} } ) );
		formatValueStub.returns( $.Deferred().resolve( 'some value' ).promise( { abort: function () {} } ) );
		widget.setData( data );

		// wait for initial render to complete
		widget.render().then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-qualifier-value' ).length, 1 );

			widget.setEditing( true ).then( function ( $element ) {
				assert.strictEqual( $element.find( '.wbmi-qualifier-value' ).length, 0 );
				done();
			} );
		} );
	} );

	QUnit.test( 'Test disabling edit state', function ( assert ) {
		var done = assert.async(),
			QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget( { editing: true } ),
			formatPropertyStub = sinon.stub( widget, 'formatProperty' ),
			formatValueStub = sinon.stub( widget, 'formatValue' ),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			);

		formatPropertyStub.returns( $.Deferred().resolve( 'some property' ).promise( { abort: function () {} } ) );
		formatValueStub.returns( $.Deferred().resolve( 'some value' ).promise( { abort: function () {} } ) );
		widget.setData( data );

		// wait for initial render to complete
		widget.render().then( function ( $element ) {
			assert.strictEqual( $element.find( '.wbmi-qualifier-value' ).length, 0 );

			widget.setEditing( false ).then( function ( $element ) {
				assert.strictEqual( $element.find( '.wbmi-qualifier-value' ).length, 1 );
				done();
			} );
		} );
	} );
} );
