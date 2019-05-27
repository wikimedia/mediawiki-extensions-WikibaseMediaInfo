var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/QualifierWidget.js',
	helpers = require( '../../support/helpers.js' ),
	sandbox;

QUnit.module( 'QualifierWidget', {
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
		var QualifierWidget = require( pathToWidget ),
			widget = new QualifierWidget(),
			data = new wikibase.datamodel.PropertyValueSnak(
				'P1',
				new wikibase.datamodel.EntityId( 'Q1' )
			);

		widget.setData( data );

		assert.ok( widget.getData() );
		assert.strictEqual( data.equals( widget.getData() ), true );
	} );
} );
