var sinon = require( 'sinon' );

module.exports.createMediaWikiEnv = function () {
	return {
		mediaInfo: {
			structuredData: {}
		}
	};
};

module.exports.createMediaWikiUser = function ( options ) {
	options = options || {};

	var user = {
		options: {}
	};

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

module.exports.createMockStorage = function () {
	return {
		get: sinon.stub(),
		set: sinon.stub()
	};
};
