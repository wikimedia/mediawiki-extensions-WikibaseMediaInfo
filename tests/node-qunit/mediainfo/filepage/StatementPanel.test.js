'use strict';

/* eslint-disable no-jquery/no-global-selector */

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/filepage/StatementPanel.js',
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' );
let sandbox,
	dom;

QUnit.module( 'StatementPanel', {}, function () {
	// Scenario 1. StatementsPanel on page where no statements are present
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
			const StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1',
					propertyType: 'wikibase-item',
					entityId: 'M1',
					properties: { P1: 'wikibase-item' }
				};

			// eslint-disable-next-line no-new
			new StatementPanel( config );

			assert.ok( true );
		} );

		QUnit.test( 'isEditable() is false by default', function ( assert ) {
			const StatementPanel = require( pathToWidget ),
				config = {
					$element: $( '.wbmi-entityview-statementsGroup' ),
					propertyId: 'P1',
					propertyType: 'wikibase-item',
					entityId: 'M1',
					properties: { P1: 'wikibase-item' }
				},
				sp = new StatementPanel( config );

			assert.strictEqual( sp.isEditable(), false );
		} );

		// Scenario 1.1: Anon user
		QUnit.module( 'User is not logged in and has not accepted license', {
			beforeEach: function () {
				global.mw.user = helpers.createMediaWikiUser();
			}
		}, function () {
			// Async test
			QUnit.test( 'LicenseDialogWidget is displayed when user attempts to edit', function ( assert ) {
				const StatementPanel = require( pathToWidget ),
					config = {
						$element: $( '.wbmi-entityview-statementsGroup' ),
						propertyId: 'P1',
						propertyType: 'wikibase-item',
						entityId: 'M1',
						properties: { P1: 'wikibase-item' }
					},
					sp = new StatementPanel( config ),
					done = assert.async();

				const spy = sinon.spy( sp.licenseDialogWidget, 'openDialog' );
				sp.makeEditable();

				setTimeout( function () {
					assert.strictEqual( spy.called, true );
					done();
				}, 100 );
			} );
		} );
	} );
} );
