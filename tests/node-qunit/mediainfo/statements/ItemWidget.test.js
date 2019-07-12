var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/ItemWidget.js',
	hooks = require( '../../support/hooks.js' );

QUnit.module( 'ItemWidget', hooks.mediainfo, function () {
	QUnit.test( 'Valid data roundtrip', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			widget = new ItemWidget(),
			data = new wikibase.datamodel.Statement(
				new wikibase.datamodel.Claim(
					new wikibase.datamodel.PropertyValueSnak(
						'P1',
						new wikibase.datamodel.EntityId( 'Q1' )
					)
				)
			);

		widget.setData( data );
		assert.ok( widget.getData() );
		assert.strictEqual( data.equals( widget.getData() ), true );
	} );

	QUnit.test( 'createQualifier() returns a new QualifierWidget', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			QualifierWidget = require( '../../../../resources/statements/QualifierWidget.js' ),
			widget = new ItemWidget(),
			qualifier;

		qualifier = widget.createQualifier();
		assert.strictEqual( qualifier instanceof QualifierWidget, true );
	} );

	QUnit.test( 'createQualifier() returns alternate new QualifierWidget with other statements enabled', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			QualifierWidget = require( '../../../../resources/statements/NewQualifierWidget.js' ),
			widget = new ItemWidget(),
			featureFlagStub = global.mw.config.get,
			qualifier;

		featureFlagStub.withArgs( 'wbmiEnableOtherStatements', false ).returns( true );
		qualifier = widget.createQualifier();
		assert.strictEqual( qualifier instanceof QualifierWidget, true );
	} );

	QUnit.test( 'createQualifier sets QualifierWidget data when snak is provided', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			widget = new ItemWidget(),
			qualifier,
			data;

		data = new wikibase.datamodel.PropertyValueSnak(
			'P1',
			new wikibase.datamodel.EntityId( 'Q1' )
		);

		qualifier = widget.createQualifier( data );
		assert.strictEqual( data.equals( qualifier.getData() ), true );
	} );

	QUnit.test( 'addQualifier creates a new QualifierWidget every time it is called', function ( assert ) {
		var ItemWidget = require( pathToWidget ),
			widget = new ItemWidget(),
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
		assert.strictEqual( spy.callCount, 0 );

		widget.addQualifier();
		assert.strictEqual( spy.callCount, 1 );

		widget.addQualifier();
		assert.strictEqual( spy.callCount, 2 );
	} );

	QUnit.skip( 'generates a QualifierWidget for each qualifier in its data' );
	QUnit.skip( 'emits change events appropriately' );
	QUnit.skip( 'handles change events from child widgets appropriately' );
} );
