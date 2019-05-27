/* eslint-disable no-jquery/no-global-selector */

var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/filepage/StatementPanel.js',
	helpers = require( '../../support/helpers.js' ),
	sandbox;

QUnit.module( 'StatementPanel', {
	beforeEach: function () {
		sandbox = sinon.createSandbox();

		// Setup OOJS and OOUI
		global.OO = require( 'oojs' );
		require( 'oojs-ui' );
		require( 'oojs-ui/dist/oojs-ui-wikimediaui.js' );

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
	// Scenario 1. StatementsPanel on page where no statements are present
	QUnit.module( 'When no pre-existing statements are present on page', {
		beforeEach: function () {
			var dom = helpers.generateTemplate( 'statementpanel.mst', 'paneldata-empty.json' );

			global.window = dom.window;
			global.document = global.window.document;
			global.jQuery = global.$ = window.jQuery = window.$ = require( 'jquery' );
			global.$.fn.msg = sinon.stub(); // stub for the jQuery msg plugin
		}
	}, function () {
		QUnit.test( 'constructor', function ( assert ) {
			var StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1'
				},
				sp = new StatementPanel( config );

			sp.initialize();
			assert.ok( true );
		} );

		QUnit.test( 'isEditable() is false by default', function ( assert ) {
			var StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1'
				},
				sp = new StatementPanel( config );

			sp.initialize();
			assert.strictEqual( sp.isEditable(), false );
		} );

		QUnit.test( 'Edit controls are hidden by default', function ( assert ) {
			var StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1'
				},
				sp = new StatementPanel( config ),
				$cancelPublish = sp.cancelPublish.$element;

			sp.initialize();
			assert.strictEqual( $cancelPublish.is( ':hidden' ), true );
		} );

		// Scenario 1.1: Anon user
		QUnit.module( 'User is not logged in and has not accepted license', {
			beforeEach: function () {
				global.mw.user = helpers.createMediaWikiUser();
			}
		}, function () {
			// Async test
			QUnit.test( 'LicenseDialogWidget is displayed when user attempts to edit', function ( assert ) {
				var StatementPanel = require( pathToWidget ),
					config = {
						$element: $( '.wbmi-entityview-statementsGroup' ),
						propertyId: 'P1'
					},
					sp = new StatementPanel( config ),
					spy,
					done = assert.async();

				sp.initialize();
				spy = sinon.spy( sp.licenseDialogWidget, 'openDialog' );
				sp.makeEditable();

				setTimeout( function () {
					assert.strictEqual( spy.called, true );
					done();
				}, 100 );
			} );
		} );
	} );
} );
