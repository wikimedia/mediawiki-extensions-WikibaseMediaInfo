/* eslint-disable no-jquery/no-global-selector */

var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/filepage/CaptionsPanel.js',
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' ),
	sandbox,
	dom;

QUnit.module( 'CaptionsPanel', {}, function () {
	// CaptionsPanel on page where statements are already present
	// eslint-disable-next-line no-restricted-properties
	QUnit.module( 'When pre-existing statements are present on page', Object.assign( {}, hooks.mediainfo, {
		beforeEach: function () {
			sandbox = sinon.createSandbox();

			// pre-construct DOM for jQuery to initialize with
			dom = helpers.generateTemplate( 'captionspanel.mst', 'captiondata.json' );
			global.window = dom.window;

			hooks.mediainfo.beforeEach();
		},
		afterEach: function () {
			hooks.mediainfo.afterEach();
			sandbox.restore();
		}
	} ), function () {
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
