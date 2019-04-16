/**
 * Mock for the statements/StatementWidget class.
 * This mock can be removed once the real StatementWidget can be require()-ed
 * in testing.
 */
var sinon = require( 'sinon' ),
	FakeStatementWidget = function () { };

FakeStatementWidget.prototype = {
	getData: sinon.stub(),
	setData: sinon.stub(),
	connect: sinon.stub()
};

module.exports = FakeStatementWidget;
