var sinon = require( 'sinon' ),
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
 * @param {string} pathToTemplate
 * @param {string} pathToData
 * @return {JSDOM} JSDOM object
 */
module.exports.generateTemplate = function ( pathToTemplate, pathToData ) {
	// eslint-disable-next-line no-undef
	var template = fs.readFileSync( path.join( __dirname, 'templates', pathToTemplate ), 'utf8' ),
		data = require( './fixtures/data/' + pathToData ),
		html = Mustache.render( template, data ),
		dom = new jsdom.JSDOM( html );

	return dom;
};

/**
 * Returns the contents of a json file as a js object
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
			exists: sinon.stub(),
			text: sinon.stub(),
			parse: sinon.stub()
		} ),

		template: {
			get: sinon.stub().returns( {
				render: sinon.stub()
			} )
		},

		// eslint-disable-next-line no-undef
		templates: new Map(),

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
	var oldglobeCoordinate = global.globeCoordinate,
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
	var oldDataValues = global.dataValues,
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
	requireAgain( 'wikibase-data-values/src/values/QuantityValue.js' );
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
		datamodel: {},
		serialization: {},
		utilities: {
			ClaimGuidGenerator: sinon.stub().returns( { newGuid: function () { return Math.random().toString( 36 ).slice( 2 ); } } )
		}
	};
};

/**
 * Loads a "wikibase.datamodel" object for use in testing.
 *
 * @return {Object}
 */
module.exports.registerWbDataModel = function () {
	var oldWikibase = global.wikibase,
		oldDataValues = global.dataValues,
		oldUtil = global.util;

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
	if ( mockCache.datamodel ) {
		mockery.registerMock( 'wikibase.datamodel', mockCache.datamodel );
		return mockCache.datamodel;
	}

	global.wikibase = { datamodel: {} };
	global.dataValues = this.createDataValuesEnv();
	global.util = {};

	requireAgain( 'wikibase-data-values/lib/util/util.inherit.js' );

	// wikibase-data-model/src/index.js exports all objects, but it
	// first expects all of them to already exist in wikibase.datamodel
	// namespace, so we're first going to have to load all of them,
	// in correct order, to make that so
	// I suspect that eventually, they'll be `required` independently
	// from index.js, in which case this block of requires can be dropped
	requireAgain( 'wikibase-data-model/src/__namespace.js' );
	requireAgain( 'wikibase-data-model/src/GroupableCollection.js' );
	requireAgain( 'wikibase-data-model/src/Group.js' );
	requireAgain( 'wikibase-data-model/src/List.js' );
	requireAgain( 'wikibase-data-model/src/Set.js' );
	requireAgain( 'wikibase-data-model/src/Snak.js' );
	requireAgain( 'wikibase-data-model/src/SnakList.js' );
	requireAgain( 'wikibase-data-model/src/Claim.js' );
	requireAgain( 'wikibase-data-model/src/Entity.js' );
	requireAgain( 'wikibase-data-model/src/EntityId.js' );
	requireAgain( 'wikibase-data-model/src/Fingerprint.js' );
	requireAgain( 'wikibase-data-model/src/FingerprintableEntity.js' );
	requireAgain( 'wikibase-data-model/src/SiteLink.js' );
	requireAgain( 'wikibase-data-model/src/SiteLinkSet.js' );
	requireAgain( 'wikibase-data-model/src/StatementGroup.js' );
	requireAgain( 'wikibase-data-model/src/StatementGroupSet.js' );
	requireAgain( 'wikibase-data-model/src/Item.js' );
	requireAgain( 'wikibase-data-model/src/Map.js' );
	requireAgain( 'wikibase-data-model/src/MultiTerm.js' );
	requireAgain( 'wikibase-data-model/src/MultiTermMap.js' );
	requireAgain( 'wikibase-data-model/src/Property.js' );
	requireAgain( 'wikibase-data-model/src/PropertyNoValueSnak.js' );
	requireAgain( 'wikibase-data-model/src/PropertySomeValueSnak.js' );
	requireAgain( 'wikibase-data-model/src/PropertyValueSnak.js' );
	requireAgain( 'wikibase-data-model/src/Reference.js' );
	requireAgain( 'wikibase-data-model/src/ReferenceList.js' );
	requireAgain( 'wikibase-data-model/src/Statement.js' );
	requireAgain( 'wikibase-data-model/src/StatementList.js' );
	requireAgain( 'wikibase-data-model/src/Term.js' );
	requireAgain( 'wikibase-data-model/src/TermMap.js' );
	mockCache.datamodel = requireAgain( 'wikibase-data-model/src/index.js' );

	mockery.registerSubstitute( 'wikibase.datamodel', 'wikibase-data-model/src/index.js' );

	// restore global scope before returning
	global.wikibase = oldWikibase;
	global.dataValues = oldDataValues;
	global.util = oldUtil;

	// once wikibase-data-model abandons the wikibase.datamodel namespace,
	// we should no longer need to use/return this object (but it currently
	// still uses objects in wikibase.datamodel in its inner workings, instead
	// of requiring them individually as needed)
	return mockCache.datamodel;
};

module.exports.deregisterWbDataModel = function () {
	mockery.deregisterMock( 'wikibase.datamodel' );
};

module.exports.registerWbSerialization = function () {
	global.util = {};

	requireAgain( 'wikibase-data-values/lib/util/util.inherit.js' );

	requireAgain( 'wikibase-serialization/src/Serializers/Serializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/Deserializer.js' );
	requireAgain( 'wikibase-serialization/src/Serializers/SnakSerializer.js' );
	requireAgain( 'wikibase-serialization/src/Serializers/SnakListSerializer.js' );
	requireAgain( 'wikibase-serialization/src/Serializers/ClaimSerializer.js' );
	requireAgain( 'wikibase-serialization/src/Serializers/ReferenceSerializer.js' );
	requireAgain( 'wikibase-serialization/src/Serializers/ReferenceListSerializer.js' );
	requireAgain( 'wikibase-serialization/src/Serializers/StatementSerializer.js' );
	requireAgain( 'wikibase-serialization/src/Serializers/StatementListSerializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/SnakDeserializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/SnakListDeserializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/ClaimDeserializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/ReferenceDeserializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/ReferenceListDeserializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/StatementDeserializer.js' );
	requireAgain( 'wikibase-serialization/src/Deserializers/StatementListDeserializer.js' );

	mockery.registerSubstitute( 'wikibase.serialization', 'wikibase-serialization/src/index.js' );
};

/**
 * Stubs out a basic stand-in for the mw.user object.
 *
 * @param {boolean} loggedIn Whether to simulate a logged-in user
 * @return {Object} user
 */
module.exports.createMediaWikiUser = function ( loggedIn ) {
	var user = {
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
	// eslint-disable-next-line no-undef
	var extensionJson = this.readJSON( path.join( __dirname, '..', '..', '..', 'extension.json' ) ),
		modules = extensionJson.ResourceModules;

	Object.keys( modules ).forEach( function ( moduleName ) {
		var packageFiles = modules[ moduleName ].packageFiles;
		if ( !packageFiles ) {
			return;
		}

		try {
			// eslint-disable-next-line no-undef
			mockery.registerMock( moduleName, require( path.join( __dirname, '..', '..', '..', packageFiles[ 0 ] ) ) );
		} catch ( e ) {
			// failed to include, but that could be ok, it might just expect immediate
			// execution in the browser - we'll have to deal with this module not
			// being available for JS tests
		}
	} );
};

module.exports.registerTemplates = function () {
	// eslint-disable-next-line no-undef
	var extensionJson = this.readJSON( path.join( __dirname, '..', '..', '..', 'extension.json' ) ),
		modules = extensionJson.ResourceModules;

	Object.keys( modules ).forEach( function ( moduleName ) {
		var templates = modules[ moduleName ].templates;
		if ( !templates ) {
			return;
		}

		templates.forEach( function ( templateName ) {
			// eslint-disable-next-line no-undef
			var template = fs.readFileSync( path.join( __dirname, '..', '..', '..', templateName ), 'utf8' );
			global.mw.template.add( moduleName, templateName, template );
		} );
	} );
};

module.exports.deregisterModules = function () {
	// eslint-disable-next-line no-undef
	var extensionJson = this.readJSON( path.join( __dirname, '..', '..', '..', 'extension.json' ) ),
		modules = extensionJson.ResourceModules;

	Object.keys( modules ).forEach( function ( moduleName ) {
		mockery.deregisterMock( moduleName );
	} );
};
