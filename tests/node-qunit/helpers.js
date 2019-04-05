var sinon = require( 'sinon' );

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

/**
 * Stubs out a basic "mw.storage" object for use in testing. Only stubs out
 * properties/methods that need to be called in the test suite; expect more
 * additions over time as the suite grows.
 *
 * @return {Object} mw.storage mock
 */
module.exports.createMockStorage = function () {
	return {
		get: sinon.stub(),
		set: sinon.stub()
	};
};
