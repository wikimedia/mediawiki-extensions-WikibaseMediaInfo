var sinon = require( 'sinon' ),
	jsdom = require( 'jsdom' ),
	fs = require( 'fs' ),
	path = require( 'path' ),
	Mustache = require( 'mustache' );

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
		}
	};
};

/**
 * Stubs out a basic stand-in for the mw.user object. Only stubs out
 * properties/methods that need to be called in the test suite; expect more
 * additions over time as the suite grows.
 *
 * @param {Object} options
 * @param {boolean} options.isLoggedIn Whether to simulate a logged-in user
 * @param {boolean} options.licenseAccepted Whether simulated user has accepted
 * CC0 license or not
 * @return {Object} user
 */
module.exports.createMediaWikiUser = function ( options ) {
	var user = {
		options: {}
	};

	options = options || {};

	if ( options.loggedIn ) {
		user.isAnon = sinon.stub().returns( false );
		user.options.set = sinon.stub();
	} else {
		user.isAnon = sinon.stub().returns( true );
	}

	if ( options.licenseAccepted ) {
		user.options.get = sinon.stub().returns( 1 );
	} else {
		user.options.get = sinon.stub().returns( 0 );
	}

	return user;
};
