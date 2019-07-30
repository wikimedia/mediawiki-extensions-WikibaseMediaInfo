/* eslint-disable no-jquery/no-global-selector */

var sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/filepage/CaptionsPanel.js',
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' ),
	sandbox,
	dom,
	mediaInfoEntity;

QUnit.module( 'CaptionsPanel', {}, function () {
	// CaptionsPanel on page where statements are already present
	// eslint-disable-next-line no-restricted-properties
	QUnit.module( 'When pre-existing statements are present on page', Object.assign( {}, hooks.mediainfo, {
		beforeEach: function () {
			sandbox = sinon.createSandbox();

			hooks.mediainfo.beforeEach();
			mediaInfoEntity = helpers.readJSON(
				// eslint-disable-next-line no-undef
				__dirname + '/../../support/fixtures/data/mediaInfoEntity.json'
			);

			// pre-construct DOM for jQuery to initialize with
			dom = helpers.generateTemplate( 'captionspanel.mst', 'mediaInfoEntity.json' );
			global.window = dom.window;
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
					userLanguages: [ 'en' ],
					languageFallbackChain: [ 'en' ]
				},
				cp = new CaptionsPanel( config );

			cp.initializeCaptionsData( mediaInfoEntity );

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
					userLanguages: userLanguages,
					languageFallbackChain: [ 'en' ]
				},
				cp = new CaptionsPanel( config );

			cp.initializeCaptionsData( mediaInfoEntity );

			// There should be a new caption row for every user language that doesn't already
			// exist in the caption data
			captionLanguages = Object.keys( mediaInfoEntity.labels );
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
