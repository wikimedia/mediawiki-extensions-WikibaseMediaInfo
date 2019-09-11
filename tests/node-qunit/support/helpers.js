var sinon = require( 'sinon' ),
	jsdom = require( 'jsdom' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	Mustache = require( 'mustache' ),
	mockery = require( 'mockery' );

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
	var globeCoordinate,
		jQuery,
		$;

	// wikibase-data-values needs jquery...
	jQuery = global.jQuery;
	$ = global.$;
	global.jQuery = global.$ = requireAgain( 'jquery' );

	global.globeCoordinate = requireAgain( 'wikibase-data-values/lib/globeCoordinate/globeCoordinate.js' ).globeCoordinate;
	requireAgain( 'wikibase-data-values/lib/globeCoordinate/globeCoordinate.GlobeCoordinate.js' );

	// remove from global scope before returning
	globeCoordinate = global.globeCoordinate;
	delete global.globeCoordinate;

	// restore original jQuery/$ code/versions
	global.jQuery = jQuery;
	global.$ = $;

	return globeCoordinate;
};

/**
 * Stubs out and/or loads a basic "dataValues" object for use in testing.
 *
 * @return {Object}
 */
module.exports.createDataValuesEnv = function () {
	var dataValues,
		jQuery,
		$;

	// wikibase-data-values needs jquery...
	jQuery = global.jQuery;
	$ = global.$;
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
	requireAgain( 'wikibase-data-model/src/__namespace.js' );

	// remove from global scope before returning
	dataValues = global.dataValues;
	delete global.dataValues;
	delete global.util;

	// restore original jQuery/$ code/versions
	global.jQuery = jQuery;
	global.$ = $;

	return dataValues;
};

/**
 * Stubs out and/or loads a basic "wikibase" object for use in testing.
 *
 * @return {Object}
 */
module.exports.createWikibaseEnv = function () {
	var wikibase;

	global.wikibase = {
		api: {
			getLocationAgnosticMwApi: sinon.stub().returns( {
				get: sinon.stub().returns( $.Deferred().resolve( {} ).promise( { abort: function () {} } ) ),
				post: sinon.stub().returns( $.Deferred().resolve( {} ).promise( { abort: function () {} } ) )
			} )
		},
		datamodel: {},
		serialization: {},
		utilities: {
			ClaimGuidGenerator: sinon.stub().returns( { newGuid: sinon.stub() } )
		}
	};

	global.util = {};

	requireAgain( 'wikibase-data-values/lib/util/util.inherit.js' );
	requireAgain( 'wikibase-data-model/src/EntityId.js' );
	requireAgain( 'wikibase-data-model/src/GroupableCollection.js' );
	requireAgain( 'wikibase-data-model/src/List.js' );
	requireAgain( 'wikibase-data-model/src/Snak.js' );
	requireAgain( 'wikibase-data-model/src/SnakList.js' );
	requireAgain( 'wikibase-data-model/src/PropertyNoValueSnak.js' );
	requireAgain( 'wikibase-data-model/src/PropertyValueSnak.js' );
	requireAgain( 'wikibase-data-model/src/Claim.js' );
	requireAgain( 'wikibase-data-model/src/Reference.js' );
	requireAgain( 'wikibase-data-model/src/ReferenceList.js' );
	requireAgain( 'wikibase-data-model/src/Statement.js' );
	requireAgain( 'wikibase-data-model/src/StatementList.js' );
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

	// remove from global scope before returning
	wikibase = global.wikibase;
	delete global.wikibase;
	delete global.util;

	return wikibase;
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

	mockery.enable( {
		warnOnReplace: false,
		warnOnUnregistered: false
	} );

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
	mockery.deregisterAll();
	mockery.disable();
};
