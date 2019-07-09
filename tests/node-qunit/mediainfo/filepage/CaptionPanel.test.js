/* eslint-disable no-jquery/no-global-selector */

var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/filepage/CaptionsPanel.js',
	helpers = require( '../../support/helpers.js' ),
	sandbox,
	dom;

QUnit.module( 'CaptionPanel', {
	beforeEach: function () {
		sandbox = sinon.createSandbox();

		dom = helpers.generateTemplate( 'captionspanel.mst', 'captiondata.json' );

		global.window = dom.window;
		global.document = global.window.document;
		global.jQuery = global.$ = window.jQuery = window.$ = require( 'jquery' );
		global.$.fn.msg = sinon.stub(); // stub for the jQuery msg plugin

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

		// the captions panel needs the ULS
		helpers.requireULS();
	},

	afterEach: function () {
		delete require.cache[ require.resolve( 'jquery' ) ];
		sandbox.reset();
		helpers.deregisterModules();
	}
}, function () {
	// CaptionsPanel on page where statements are already present
	QUnit.module( 'When pre-existing statements are present on page', {
		beforeEach: function () {
		}
	}, function () {
		QUnit.test( 'initialization works without errors', function ( assert ) {
			var CaptionsPanel = require( pathToWidget ),
				config = {
					classes: {
						header: 'wbmi-entityview-captions-header',
						content: 'wbmi-entityview-captionsPanel',
						entityTerm: 'wbmi-entityview-caption'
					},
					warnWithinMaxCaptionLength: 20,
					captionsExist: true,
					userLanguages: []
				},
				cp = new CaptionsPanel( config );

			cp.initialize();

			assert.ok( true );
		} );

		QUnit.test( 'user languages are added to DOM', function ( assert ) {
			var CaptionsPanel = require( pathToWidget ),
				userLanguages = [ 'en', 'ga', 'de' ],
				captionLanguages,
				config = {
					classes: {
						header: 'wbmi-entityview-captions-header',
						content: 'wbmi-entityview-captionsPanel',
						entityTerm: 'wbmi-entityview-caption'
					},
					warnWithinMaxCaptionLength: 20,
					captionsExist: true,
					userLanguages: userLanguages
				},
				captionData = helpers.readJSON(
					// eslint-disable-next-line no-undef
					__dirname + '/../../support/fixtures/data/captiondata.json'
				),
				cp = new CaptionsPanel( config );

			cp.initialize();

			// There should be a new caption row for every user language that doesn't already
			// exist in the caption data
			captionLanguages = captionData.allLangCodes.split( ',' );
			userLanguages.forEach( function ( langCode ) {
				if ( captionLanguages.indexOf( langCode ) === -1 ) {
					captionLanguages.push( langCode );
				}
			} );

			assert.strictEqual(
				$( '.wbmi-entityview-caption' ).length,
				captionLanguages.length
			);
		} );
	} );
} );
