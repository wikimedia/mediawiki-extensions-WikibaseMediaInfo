'use strict';

const sinon = require( 'sinon' ),
	jsdom = require( 'jsdom' ),
	helpers = require( './helpers.js' ),
	mockery = require( 'mockery' ),
	wbDataTypes = require( './fixtures/data/wbDataTypes.json' ),
	wbmiPropertyTypes = require( './fixtures/data/wbmiPropertyTypes.json' ),
	sandboxes = {};
let dom;

module.exports.jquery = {
	beforeEach: function () {
		sandboxes.jquery = sinon.createSandbox();

		// construct DOM is none exists yet
		if ( !global.window ) {
			dom = new jsdom.JSDOM( '<!doctype html><html lang="en"><body></body></html>' );
			global.window = dom.window;
		}
		global.window.scrollTo = function () { /* noop */ };

		global.document = global.window.document;
		global.jQuery = global.$ = global.window.jQuery = global.window.$ = require( 'jquery' );
	},
	afterEach: function () {
		delete require.cache[ require.resolve( 'jquery' ) ];
		sandboxes.jquery.restore();
	}
};

module.exports.ooui = Object.assign( {}, module.exports.jquery, {
	beforeEach: function () {
		// jQuery is a requirement for OOUI
		module.exports.jquery.beforeEach();

		sandboxes.ooui = sinon.createSandbox();

		global.OO = require( 'oojs' );
		require( 'oojs-ui' );
		require( '../../../node_modules/oojs-ui/dist/oojs-ui-wikimediaui.js' );
	},
	afterEach: function () {
		delete require.cache[ require.resolve( 'oojs-ui/dist/oojs-ui-wikimediaui.js' ) ];
		delete require.cache[ require.resolve( 'oojs-ui' ) ];
		delete require.cache[ require.resolve( 'oojs' ) ];
		sandboxes.ooui.restore();
		module.exports.jquery.afterEach();
	}
} );

module.exports.mediawiki = Object.assign( {}, module.exports.jquery, {
	beforeEach: function () {
		// jQuery is a requirement for MediaWiki
		module.exports.jquery.beforeEach();

		sandboxes.mediawiki = sinon.createSandbox();

		global.mw = helpers.createMediaWikiEnv();

		// expand jQuery with MediaWiki-specific plugin
		global.$.fn.msg = sinon.stub(); // stub for the jQuery msg plugin

		// Setup Mustache & templating
		// @todo refactor createMediaWikiEnv, and load *this* inside there...
		global.Mustache = require( 'mustache' );
		helpers.requireAgain( 'mediawiki/resources/src/mediawiki.template.js' );
		helpers.requireAgain( 'mediawiki/resources/src/mediawiki.template.mustache.js' );
		helpers.requireAgain( '../../../resources/mediawiki.template.mustache+dom.js' );
	},
	afterEach: function () {
		sandboxes.mediawiki.restore();
		module.exports.jquery.afterEach();
	}
} );

module.exports.wikibase = Object.assign( {}, module.exports.mediawiki, {
	beforeEach: function () {
		// MediaWiki is a requirement for Wikibase
		module.exports.mediawiki.beforeEach();

		mockery.enable( {
			warnOnReplace: false,
			warnOnUnregistered: false
		} );

		sandboxes.wikibase = sinon.createSandbox();

		global.globeCoordinate = helpers.createGlobeCoordinateEnv();
		global.dataValues = helpers.createDataValuesEnv();
		global.wikibase = helpers.createWikibaseEnv();
		helpers.registerWbDataModel();
		global.mw.config.get.withArgs( 'wbDataTypes' ).returns( wbDataTypes );

		helpers.registerWbSerialization();
	},
	afterEach: function () {
		sandboxes.wikibase.restore();
		mockery.disable();
		module.exports.mediawiki.afterEach();
	}
} );

module.exports.mediainfo = Object.assign( {}, module.exports.ooui, module.exports.wikibase, {
	beforeEach: function () {
		// jQuery, OOUI, MediaWiki Wikibase are requirements for MediaInfo
		module.exports.ooui.beforeEach();
		module.exports.wikibase.beforeEach();

		sandboxes.mediainfo = sinon.createSandbox();

		global.mw.config.get.withArgs( 'wbmiPropertyTypes' ).returns( wbmiPropertyTypes );

		// the captions panel needs the ULS
		helpers.requireULS();

		// make sure that mediainfo modules (usually exposed via RL)
		// can be required, and templates are known
		helpers.registerModules();
		helpers.registerTemplates();
	},
	afterEach: function () {
		helpers.deregisterModules();
		sandboxes.mediainfo.restore();
		module.exports.wikibase.afterEach();
		module.exports.ooui.afterEach();
	}
} );

module.exports.kartographer = Object.assign( {}, module.exports.mediainfo, {
	beforeEach: function () {
		const loaderStub = sinon.stub();

		module.exports.mediainfo.beforeEach();
		sandboxes.kartographer = sinon.createSandbox();

		loaderStub.withArgs( 'ext.kartographer.box' ).returns( {
			map: sinon.stub().returns( {
				invalidateSize: sinon.stub(),
				on: sinon.stub(),
				off: sinon.stub()
			} )
		} );

		loaderStub.withArgs( 'ext.kartographer.editing' ).returns( {
			getKartographerLayer: sinon.stub().returns( {
				setGeoJSON: sinon.stub(),
				clearLayers: sinon.stub()
			} )
		} );

		global.mw.loader.using.returns(
			$.Deferred().resolve( loaderStub ).promise()
		);

		global.MutationObserver = function () {};
		global.MutationObserver.prototype = {
			observe: sinon.stub()
		};
	},

	afterEach: function () {
		sandboxes.kartographer.restore();
		module.exports.mediawiki.afterEach();
	}
} );
