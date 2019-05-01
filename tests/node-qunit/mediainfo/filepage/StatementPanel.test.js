/* eslint-disable no-jquery/no-global-selector */

var sinon = require( 'sinon' ),
	mockery = require( 'mockery' ),
	pathToWidget = '../../../../resources/filepage/StatementPanel.js',
	helpers = require( '../../support/helpers.js' ),
	sandbox;

QUnit.module( 'StatementPanel', {
	beforeEach: function () {
		var FakeStatementWidget = require( '../../support/mocks/FakeStatementWidget' ),
			FakeStatementListDeserializer = require( '../../support/mocks/FakeStatementListDeserializer' );

		sandbox = sinon.createSandbox();

		// Setup OOJS and OOUI
		global.OO = require( 'oojs' );
		require( 'oojs-ui' );
		require( 'oojs-ui/dist/oojs-ui-wikimediaui.js' );

		// Setup wikibase
		global.dataValues = global.dataValues || require( 'wikibase-data-values/src/dataValues.js' ).dataValues;
		global.util = global.util || {};
		require( 'wikibase-data-values/lib/util/util.inherit.js' );
		require( 'wikibase-data-values/src/DataValue.js' );
		require( 'wikibase-data-values/src/values/DecimalValue.js' );
		require( 'wikibase-data-values/src/values/QuantityValue.js' );
		require( 'wikibase-data-model/src/__namespace.js' );
		global.wikibase = global.wikibase || window.wikibase;
		require( 'wikibase-data-model/src/EntityId.js' );
		require( 'wikibase-data-model/src/GroupableCollection.js' );
		require( 'wikibase-data-model/src/List.js' );
		require( 'wikibase-data-model/src/Snak.js' );
		require( 'wikibase-data-model/src/SnakList.js' );
		require( 'wikibase-data-model/src/PropertyValueSnak.js' );
		require( 'wikibase-data-model/src/Statement.js' );
		require( 'wikibase-data-model/src/StatementList.js' );

		// Set up global MW and wikibase objects
		global.mw = helpers.createMediaWikiEnv();
		global.mw.message = sinon.stub().returns( { text: sinon.stub(), parse: sinon.stub() } );
		global.mw.mediaInfo.statements = { StatementWidget: FakeStatementWidget };
		global.wikibase.api = {
			getLocationAgnosticMwApi: function () {
				return {
					get: function () { return $.Deferred().promise(); },
					post: function () { return $.Deferred().promise(); }
				};
			}
		};
		global.wikibase.serialization = { StatementListDeserializer: FakeStatementListDeserializer };

		// RL loader modules are not exposed, so let's make sure they're
		// known when source code requires it...
		mockery.registerMock( 'wikibase.mediainfo.statements', require( '../../../../resources/statements/index.js' ) );
		mockery.enable( {
			warnOnReplace: false,
			warnOnUnregistered: false
		} );
	},

	afterEach: function () {
		delete require.cache[ require.resolve( 'jquery' ) ];
		sandbox.reset();
		mockery.deregisterAll();
		mockery.disable();
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

		QUnit.test( 'Edit controls receive .wbmi-hidden class by default', function ( assert ) {
			var StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1'
				},
				sp = new StatementPanel( config ),
				$cancelPublish = sp.cancelPublish.$element;

			sp.initialize();
			assert.strictEqual( $cancelPublish[ 0 ].classList.contains( 'wbmi-hidden' ), true );
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
