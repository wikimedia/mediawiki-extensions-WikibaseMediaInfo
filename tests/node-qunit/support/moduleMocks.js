'use strict';

/**
 * Replacement for the "mockery" package, which is no longer maintained.
 *
 * MediaWiki ResourceLoader module names, for example "wikibase.datamodel",
 * are not files on disk. This module makes "require" return a given object
 * for such a name, or load a different module in its place.
 *
 * The registries are Map objects. A Map keeps the module names apart from
 * Object.prototype. Thus a module name such as "__proto__" cannot change
 * a prototype.
 */

/* eslint-disable no-underscore-dangle -- Module._load is the documented hook. */

const Module = require( 'module' );

const mocks = new Map();
const substitutes = new Map();

let originalLoad = null;

/**
 * Make "require" use the registered mocks and substitutes.
 * A second call has no result.
 */
module.exports.enable = function () {
	if ( originalLoad ) {
		return;
	}

	originalLoad = Module._load;
	Module._load = function ( request, parent, isMain ) {
		if ( mocks.has( request ) ) {
			return mocks.get( request );
		}
		if ( substitutes.has( request ) ) {
			// Resolve the substitute from this file, not from the module that
			// calls require. Some packages supply their own copy of a
			// dependency. Resolution from the caller can find that other copy.
			return require( substitutes.get( request ) );
		}
		return originalLoad( request, parent, isMain );
	};
};

/**
 * Make "require" operate normally again.
 * A second call has no result.
 */
module.exports.disable = function () {
	if ( !originalLoad ) {
		return;
	}

	Module._load = originalLoad;
	originalLoad = null;
};

/**
 * Make "require( name )" return the given object.
 *
 * @param {string} name Module name
 * @param {*} mock Object to return
 */
module.exports.registerMock = function ( name, mock ) {
	mocks.set( name, mock );
};

/**
 * Remove a mock. "require( name )" then operates normally again.
 *
 * @param {string} name Module name
 */
module.exports.deregisterMock = function ( name ) {
	mocks.delete( name );
};

/**
 * Make "require( name )" load a different module.
 *
 * @param {string} name Module name
 * @param {string} substitute Name of the module to load in its place
 */
module.exports.registerSubstitute = function ( name, substitute ) {
	substitutes.set( name, substitute );
};
