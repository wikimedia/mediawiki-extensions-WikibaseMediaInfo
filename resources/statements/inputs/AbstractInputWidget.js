'use strict';

/**
 * @abstract
 * @param {Object} config Configuration options
 * @param {boolean} [config.isQualifier] True when used as qualifier value, false (default) for statement level
 */
// eslint-disable-next-line no-unused-vars
var AbstractInputWidget = function MediaInfoStatementsAbstractInputWidget( config ) {};

/**
 * Fired when the value is considered "complete" (e.g. hitting "enter", clicking "add", ...)
 *
 * @event add
 * @param {AbstractInputWidget}
 */

/**
 * Fired as the value changes.
 *
 * @event change
 * @param {AbstractInputWidget}
 */

/**
 * Returns a raw input value as understood by the wbparsevalue API endpoint.
 *
 * @abstract
 * @return {string}
 */
AbstractInputWidget.prototype.getRawValue = function () {
	throw new Error( 'Not implemented' );
};

/**
 * Returns options for input as understood by the wbparsevalue API endpoint.
 *
 * @return {Object}
 */
AbstractInputWidget.prototype.getRawValueOptions = function () {
	return undefined;
};

/**
 * Returns a DataValue object that corresponds to the current input.
 * This method could throw errors for obvious input errors that can
 * be checked client-side, but the returned object is not guaranteed
 * to be valid (see `validate()` for serverside validation)
 *
 * @abstract
 * @return {dataValues.DataValue}
 * @throws {Error}
 */
AbstractInputWidget.prototype.getData = function () {
	throw new Error( 'Not implemented' );
};

/**
 * Update the input widget to reflect the given data.
 *
 * @abstract
 * @param {dataValues.DataValue} data
 * @return {jQuery.Promise}
 */
// eslint-disable-next-line no-unused-vars
AbstractInputWidget.prototype.setData = function ( data ) {
	throw new Error( 'Not implemented' );
};

/**
 * More rigorous, server-side, validation (the kind of validation that
 * data will undergo when it'll actually be submitted to the server)
 * This includes validating the data for the datatype of the property
 * it's related with (e.g. any string input might me fine for a 'string'
 * property, but will require a schema etc. for a 'url' property)
 *
 * Returns a promise that resolves with the relevant DataValue, or is
 * rejected when the input is invalid.
 *
 * @param {string} datatype The datatype of the relevant property to validate against
 * @return {jQuery.Promise.<dataValues.DataValue>}
 */
AbstractInputWidget.prototype.parseValue = function ( datatype ) {
	var api = wikibase.api.getLocationAgnosticMwApi(
		mw.config.get( 'wbmiRepoApiUrl', mw.config.get( 'wbRepoApiUrl' ) )
	);

	// try client-side validation (if any) first
	try {
		this.getData();
	} catch ( e ) {
		return $.Deferred().reject( e.message );
	}

	// parse on the server
	return api.get( {
		action: 'wbparsevalue',
		format: 'json',
		datatype: datatype,
		values: [ this.getRawValue() ],
		options: this.getRawValueOptions(),
		validate: true
	} ).then(
		function ( response ) {
			var rawValue = response.results[ 0 ];
			return dataValues.newDataValue( rawValue.type, rawValue.value );
		},
		function ( errorCode, response ) {
			return $.Deferred().reject( response.error.info );
		}
	);
};

/**
 * Use OOUI widget setValidityFlag method to indicate that an input within
 * this widget has caused an error.
 *
 * @abstract
 */
AbstractInputWidget.prototype.flagAsInvalid = function () {
	// Not every input type will be able to use this method; input types with a
	// single OOUI input widget (e.g. string, quantity) can use this method to
	// call the setValidityFlag method of their OOUI input, but more complex
	// input types may have input-level validation or more complex logic for
	// determining which input(s) to highlight as invalid.
	return;
};

module.exports = AbstractInputWidget;
