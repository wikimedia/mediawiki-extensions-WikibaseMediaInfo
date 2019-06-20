var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/ItemWidget.js',
	helpers = require( '../../support/helpers.js' ),
	sandbox;

QUnit.module( 'ItemWidget', {
	beforeEach: function () {
		sandbox = sinon.createSandbox();

		// Set up global MW and wikibase objects
		global.mw = helpers.createMediaWikiEnv();
		global.dataValues = helpers.createDataValuesEnv();
		global.wikibase = helpers.createWikibaseEnv();

		// make sure that mediainfo modules (usually exposed via RL)
		// can be required
		helpers.registerModules();
	},

	afterEach: function () {
		delete require.cache[ require.resolve( 'jquery' ) ];
		sandbox.reset();
		helpers.deregisterModules();
	}
}, function () {
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
