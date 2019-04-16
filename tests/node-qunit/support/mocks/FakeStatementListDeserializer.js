/**
 * Mock for the wikibase.serialization.StatementListDeserializer class.
 */
var sinon = require( 'sinon' ),
	FakeStatementListDeserializer = function () {};

FakeStatementListDeserializer.prototype = {
	deserialize: sinon.stub()
};

module.exports = FakeStatementListDeserializer;
