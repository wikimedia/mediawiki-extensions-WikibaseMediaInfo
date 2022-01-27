'use strict';

const sinon = require( 'sinon' ),
	jsdom = require( 'jsdom' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	Mustache = require( 'mustache' ),
	mockery = require( 'mockery' ),
	mockCache = {};

/**
 * Allows requiring a module more than once.
 * Useful for e.g. wikibase files, which aren't really modules,
 * but code that is executed immediately, which we'll want to
 * run before every test.
 *
 * @param {string} module
 * @return {*}
 */
function requireAgain( module ) {
	try {
		delete require.cache[ require.resolve( module ) ];
	} catch ( e ) {
		// couldn't resolve module, so there'll be no cache for sure
	}
	return require( module );
}
module.exports.requireAgain = requireAgain;

/**
 * Builds a template for use in testing when given a Mustache template and JSON
 * data to populate it. Paths should be relative to the "support" directory.
 *
 * @param {string} pathToTemplate
 * @param {string} pathToData
 * @return {jsdom.JSDOM} JSDOM object
 */
module.exports.generateTemplate = function ( pathToTemplate, pathToData ) {
	const template = fs.readFileSync( path.join( __dirname, 'templates', pathToTemplate ), 'utf8' ),
		data = require( './fixtures/data/' + pathToData ),
		html = Mustache.render( template, data ),
		dom = new jsdom.JSDOM( html );

	return dom;
};

/**
 * Returns the contents of a json file as a js object
 *
 * @param {string} pathToFile
 * @return {Object}
 */
module.exports.readJSON = function ( pathToFile ) {
	return JSON.parse( fs.readFileSync( pathToFile, 'utf8' ) );
};

/**
 * Stubs out a basic "mw" object for use in testing. Only stubs out
 * properties/methods that need to be called in the test suite; expect more
 * additions over time as the suite grows.
 *
 * @return {Object} mw
 */
module.exports.createMediaWikiEnv = function () {
	return {
		mediaInfo: {
			structuredData: {}
		},

		config: {
			get: sinon.stub(),
			set: sinon.stub()
		},

		notify: sinon.stub(),

		storage: {
			get: sinon.stub(),
			set: sinon.stub()
		},

		cookie: {
			get: sinon.stub(),
			set: sinon.stub()
		},

		message: sinon.stub().returns( {
			escaped: sinon.stub(),
			exists: sinon.stub(),
			text: sinon.stub(),
			parse: sinon.stub()
		} ),

		msg: sinon.stub(),

		template: {
			get: sinon.stub().returns( {
				render: sinon.stub()
			} )
		},

		loader: {
			using: sinon.stub().resolves( sinon.stub() )
		},

		templates: new Map(),

		Title: sinon.stub().returns( {
			getNameText: sinon.stub(),
			getNamespaceId: sinon.stub()
		} ),

		html: {
			escape: sinon.stub()
		}
	};
};

/**
 * Stubs out and/or loads a basic "globeCoordinate" object for use in testing.
 *
 * @return {Object}
 */
module.exports.createGlobeCoordinateEnv = function () {
	const oldglobeCoordinate = global.globeCoordinate,
		oldJQuery = global.jQuery,
		old$ = global.$;

	// `require` caches the exports and reuses them the next require
	// the files required below have no exports, though - they just
	// execute and are assigned as properties of an object
	// `requireAgain` would make sure they keep doing that over and
	// over, but then they'll end up creating the same functions/objects
	// more than once, but different instances...
	// other modules, with actual exports, that use these functions
	// might encounter side-effects though, because the instances of
	// those objects are different when loaded at different times,
	// so to be safe, we'll try to emulate regular `require` behavior
	// by running these files once, grabbing the result, caching it,
	// and re-using the result from cache
	if ( mockCache.globeCoordinate ) {
		return mockCache.globeCoordinate;
	}

	// wikibase-data-values needs jquery...
	global.jQuery = global.$ = requireAgain( 'jquery' );

	global.globeCoordinate = requireAgain( 'wikibase-data-values/lib/globeCoordinate/globeCoordinate.js' ).globeCoordinate;
	requireAgain( 'wikibase-data-values/lib/globeCoordinate/globeCoordinate.GlobeCoordinate.js' );

	mockCache.globeCoordinate = global.globeCoordinate;
	global.globeCoordinate = oldglobeCoordinate;

	// restore global scope before returning
	global.jQuery = oldJQuery;
	global.$ = old$;

	return mockCache.globeCoordinate;
};

/**
 * Stubs out and/or loads a basic "dataValues" object for use in testing.
 *
 * @return {Object}
 */
module.exports.createDataValuesEnv = function () {
	const oldDataValues = global.dataValues,
		oldUtil = global.util,
		oldJQuery = global.jQuery,
		old$ = global.$;

	// `require` caches the exports and reuses them the next require
	// the files required below have no exports, though - they just
	// execute and are assigned as properties of an object
	// `requireAgain` would make sure they keep doing that over and
	// over, but then they'll end up creating the same functions/objects
	// more than once, but different instances...
	// other modules, with actual exports, that use these functions
	// might encounter side-effects though, because the instances of
	// those objects are different when loaded at different times,
	// so to be safe, we'll try to emulate regular `require` behavior
	// by running these files once, grabbing the result, caching it,
	// and re-using the result from cache
	if ( mockCache.dataValues ) {
		return mockCache.dataValues;
	}

	// wikibase-data-values needs jquery...
	global.jQuery = global.$ = requireAgain( 'jquery' );

	global.dataValues = requireAgain( 'wikibase-data-values/src/dataValues.js' ).dataValues;
	global.util = {};

	requireAgain( 'wikibase-data-values/lib/util/util.inherit.js' );
	requireAgain( 'wikibase-data-values/src/DataValue.js' );
	requireAgain( 'wikibase-data-values/src/values/StringValue.js' );
	requireAgain( 'wikibase-data-values/src/values/DecimalValue.js' );
	requireAgain( 'wikibase-data-values/src/values/MonolingualTextValue.js' );
	requireAgain( 'wikibase-data-values/src/values/QuantityValue.js' );
	requireAgain( 'wikibase-data-values/src/values/TimeValue.js' );
	requireAgain( 'wikibase-data-values/src/values/GlobeCoordinateValue.js' );
	requireAgain( 'wikibase-data-values/src/values/UnknownValue.js' );

	mockCache.dataValues = global.dataValues;

	// restore global scope before returning
	global.dataValues = oldDataValues;
	global.util = oldUtil;
	global.jQuery = oldJQuery;
	global.$ = old$;

	return mockCache.dataValues;
};

/**
 * Stubs out and/or loads a basic "wikibase" object for use in testing.
 *
 * @return {Object}
 */
module.exports.createWikibaseEnv = function () {
	return {
		api: {
			getLocationAgnosticMwApi: sinon.stub().returns( {
				get: sinon.stub().returns( $.Deferred().resolve( {} ).promise( { abort: function () {} } ) ),
				post: sinon.stub().returns( $.Deferred().resolve( {} ).promise( { abort: function () {} } ) )
			} )
		},
		utilities: {
			ClaimGuidGenerator: sinon.stub().returns( { newGuid: function () { return Math.random().toString( 36 ).slice( 2 ); } } )
		}
	};
};

/**
 * Loads a "wikibase.datamodel" object for use in testing.
 */
module.exports.registerWbDataModel = function () {
	global.dataValues = this.createDataValuesEnv();
	global.util = {};

	requireAgain( 'wikibase-data-values/lib/util/util.inherit.js' );

	mockery.registerSubstitute( 'wikibase.datamodel', 'wikibase-data-model/src/index.js' );
};

module.exports.registerWbSerialization = function () {
	global.util = {};

	requireAgain( 'wikibase-data-values/lib/util/util.inherit.js' );

	mockery.registerSubstitute( 'wikibase.serialization', 'wikibase-serialization/src/index.js' );
};

/**
 * Stubs out a basic stand-in for the mw.user object.
 *
 * @param {boolean} loggedIn Whether to simulate a logged-in user
 * @return {Object} user
 */
module.exports.createMediaWikiUser = function ( loggedIn ) {
	const user = {
		isAnon: sinon.stub(),
		options: {
			get: sinon.stub(),
			set: sinon.stub()
		}
	};

	if ( loggedIn ) {
		user.isAnon.returns( false );
	} else {
		user.isAnon.returns( true );
	}

	return user;
};

module.exports.requireULS = function () {
	requireAgain( 'jquery.uls/src/jquery.uls.data.js' );
	requireAgain( 'jquery.uls/src/jquery.uls.data.utils.js' );
	requireAgain( 'jquery.uls/src/jquery.uls.core.js' );
	requireAgain( 'jquery.uls/src/jquery.uls.lcd.js' );
	requireAgain( 'jquery.uls/src/jquery.uls.languagefilter.js' );
};

module.exports.registerModules = function () {
	const extensionJson = this.readJSON( path.join( __dirname, '..', '..', '..', 'extension.json' ) ),
		modules = extensionJson.ResourceModules;

	Object.keys( modules ).forEach( function ( moduleName ) {
		const packageFiles = modules[ moduleName ].packageFiles;
		if ( !packageFiles ) {
			return;
		}

		try {
			mockery.registerMock( moduleName, require( path.join( __dirname, '..', '..', '..', packageFiles[ 0 ] ) ) );
		} catch ( e ) {
			// failed to include, but that could be ok, it might just expect immediate
			// execution in the browser - we'll have to deal with this module not
			// being available for JS tests
		}
	} );
};

module.exports.registerTemplates = function () {
	const extensionJson = this.readJSON( path.join( __dirname, '..', '..', '..', 'extension.json' ) ),
		modules = extensionJson.ResourceModules;

	Object.keys( modules ).forEach( function ( moduleName ) {
		const templates = modules[ moduleName ].templates;
		if ( !templates ) {
			return;
		}

		templates.forEach( function ( templateName ) {
			const template = fs.readFileSync( path.join( __dirname, '..', '..', '..', templateName ), 'utf8' );
			global.mw.template.add( moduleName, templateName, template );
		} );
	} );
};

module.exports.deregisterModules = function () {
	const extensionJson = this.readJSON( path.join( __dirname, '..', '..', '..', 'extension.json' ) ),
		modules = extensionJson.ResourceModules;

	Object.keys( modules ).forEach( function ( moduleName ) {
		mockery.deregisterMock( moduleName );
	} );
};
