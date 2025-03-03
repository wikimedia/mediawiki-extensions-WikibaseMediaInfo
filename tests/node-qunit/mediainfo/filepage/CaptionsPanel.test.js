'use strict';

const sinon = require( 'sinon' ),
	pathToWidget = '../../../../resources/filepage/CaptionsPanel.js',
	helpers = require( '../../support/helpers.js' ),
	hooks = require( '../../support/hooks.js' );
let sandbox,
	dom,
	mediaInfoEntity;

QUnit.module( 'CaptionsPanel', {}, () => {
	// CaptionsPanel on page where statements are already present
	QUnit.module( 'When pre-existing statements are present on page', Object.assign( {}, hooks.mediainfo, {
		beforeEach: function () {
			sandbox = sinon.createSandbox();

			hooks.mediainfo.beforeEach();
			mediaInfoEntity = helpers.readJSON(
				__dirname + '/../../support/fixtures/data/mediaInfoEntity.json'
			);

			// pre-construct DOM for jQuery to initialize with
			dom = helpers.generateTemplate( 'captionspanel.mst', 'mediaInfoEntity.json' );
			global.window = dom.window;
			global.window.scrollTo = function () { /* noop */ };
		},
		afterEach: function () {
			hooks.mediainfo.afterEach();
			sandbox.restore();
		}
	} ), () => {
		QUnit.test( 'initialization works without errors', ( assert ) => {
			const CaptionsPanel = require( pathToWidget ),
				config = {
					warnWithinMaxCaptionLength: 20,
					userLanguages: [ 'en' ],
					languageFallbackChain: [ 'en' ],
					mediaInfo: mediaInfoEntity,
					canEdit: true
				},
				// eslint-disable-next-line no-unused-vars
				cp = new CaptionsPanel( config );

			assert.ok( true );
		} );

		QUnit.test( 'user languages are added to DOM', ( assert ) => {
			const CaptionsPanel = require( pathToWidget ),
				userLanguages = [ 'en', 'ga', 'de' ],
				config = {
					warnWithinMaxCaptionLength: 20,
					userLanguages: userLanguages,
					languageFallbackChain: [ 'en' ],
					mediaInfo: mediaInfoEntity,
					canEdit: true
				},
				cp = new CaptionsPanel( config ),
				done = assert.async();

			// There should be a new caption row for every user language that doesn't already
			// exist in the caption data
			const captionLanguages = Object.keys( mediaInfoEntity.labels );
			userLanguages.forEach( ( langCode ) => {
				if ( !captionLanguages.includes( langCode ) ) {
					captionLanguages.push( langCode );
				}
			} );

			cp.renderPromise.then( () => {
				assert.strictEqual(
					cp.$element.find( '.wbmi-entityview-caption' ).length,
					captionLanguages.length
				);
				done();
			} );
		} );
	} );
} );
