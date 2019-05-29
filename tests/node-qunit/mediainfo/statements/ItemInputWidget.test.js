var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/ItemInputWidget.js',
	helpers = require( '../../support/helpers.js' ),
	sandbox;

QUnit.module( 'ItemInputWidget', {
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
		var ItemInputWidget = require( pathToWidget ),
			widget = new ItemInputWidget(),
			data = new wikibase.datamodel.EntityId( 'Q1' );

		widget.setData( data );

		assert.ok( widget.getData() );
		assert.strictEqual( data.equals( widget.getData() ), true );
	} );
} );
