/* eslint no-eval: "off" */
/* eslint no-unused-vars: "off" */

/**
 * OOUI Shim for node QUnit tests.
 * UI elements in this extension depend heavily on the OOJS-UI library. The
 * parent OOJS lib includes a `module.exports` statement which allows it to be
 * consumed as a module via `require()`. OOUI does not expose a module in this
 * way currently; the library is intended to be made globally avalable through
 * the inclusion of a <script> tag.
 *
 * This file acts as a wrapper for OOUI in a node environment. The relevant
 * scripts in the package /dist folder are loaded into an isolated scope using
 * `eval()` and then are exported as a module.
 */
( function () {
	var fs = require( 'fs' ),
		OO = require( 'oojs' );

	function evalFile( path ) {
		function read( path ) {
			return fs.readFileSync( 'node_modules/oojs-ui/' + path, 'utf8' );
		}

		eval( read( path ) );
	}

	evalFile( 'dist/oojs-ui.js' );
	evalFile( 'dist/oojs-ui-wikimediaui.js' );

	module.exports = OO.ui;
}() );
