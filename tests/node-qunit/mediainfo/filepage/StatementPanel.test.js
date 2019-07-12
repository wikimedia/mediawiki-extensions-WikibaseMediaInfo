/* eslint-disable no-jquery/no-global-selector */

var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/filepage/StatementPanel.js',
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' ),
	sandbox,
	dom;

QUnit.module( 'StatementPanel', {}, function () {
	// Scenario 1. StatementsPanel on page where no statements are present
	// eslint-disable-next-line no-restricted-properties
	QUnit.module( 'When no pre-existing statements are present on page', Object.assign( {}, hooks.mediainfo, {
		beforeEach: function () {
			sandbox = sinon.createSandbox();

			// pre-construct DOM for jQuery to initialize with
			dom = helpers.generateTemplate( 'statementpanel.mst', 'paneldata-empty.json' );
			global.window = dom.window;

			hooks.mediainfo.beforeEach();
		},
		afterEach: function () {
			hooks.mediainfo.afterEach();
			sandbox.restore();
		}
	} ), function () {
		QUnit.test( 'constructor', function ( assert ) {
			var StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1',
					entityId: 'M1',
					properties: { P1: 'wikibase-entityid' }
				},
				sp = new StatementPanel( config );

			sp.initialize();
			assert.ok( true );
		} );

		QUnit.test( 'isEditable() is false by default', function ( assert ) {
			var StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1',
					entityId: 'M1',
					properties: { P1: 'wikibase-entityid' }
				},
				sp = new StatementPanel( config );

			sp.initialize();
			assert.strictEqual( sp.isEditable(), false );
		} );

		QUnit.test( 'Edit controls are hidden by default', function ( assert ) {
			var StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1',
					entityId: 'M1',
					properties: { P1: 'wikibase-entityid' }
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
						propertyId: 'P1',
						entityId: 'M1',
						properties: { P1: 'wikibase-entityid' }
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
