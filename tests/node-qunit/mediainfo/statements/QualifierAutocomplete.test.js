var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/statements/QualifierAutocomplete.js',
	helpers = require( '../../support/helpers.js' ),
	sandbox;

QUnit.module( 'QualifierAutocomplete', {
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
		var QualifierAutocomplete = require( pathToWidget ),
			widget = new QualifierAutocomplete(),
			property = { id: 'P1', label: 'Some Property' };

		widget.setData( property );
		assert.deepEqual( widget.getData(), property );
	} );

	QUnit.test( 'setData() sets input value if optional label argument is provided', function ( assert ) {
		var QualifierAutocomplete = require( pathToWidget ),
			widget = new QualifierAutocomplete(),
			property = { id: 'P1', label: 'Some Property' };

		widget.setData( property );
		assert.deepEqual( widget.getData(), property );
		assert.deepEqual( widget.value, property.label );
	} );
} );
